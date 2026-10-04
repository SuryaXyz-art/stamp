// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StampBox} from "../src/StampBox.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev A sender that can send stamps but rejects all incoming USDC (no receive / fallback).
contract RejectingSender {
    StampBox immutable box;

    constructor(StampBox _box) {
        box = _box;
    }

    function send(address to) external payable returns (uint256) {
        return box.send{value: msg.value}(to, "hello from a contract");
    }

    function reclaim(uint256 id) external {
        box.reclaim(id);
    }

    function withdrawTo(address to) external {
        box.withdrawTo(to);
    }

    function withdraw() external {
        box.withdraw();
    }
}

/// @dev Mimics Circle's USDC blocklist on Arc: transfers to a blocked address revert until unblocked.
contract BlocklistableWallet {
    StampBox immutable box;
    bool public blocked = true;

    constructor(StampBox _box) {
        box = _box;
    }

    function setBlocked(bool b) external {
        blocked = b;
    }

    function send(address to) external payable returns (uint256) {
        return box.send{value: msg.value}(to, "hi");
    }

    function withdraw() external {
        box.withdraw();
    }

    receive() external payable {
        require(!blocked, "Blocklisted");
    }
}

/// @dev Burns all forwarded gas, or returns a huge blob, to try to grief the receiver's refund.
contract GriefingSender {
    StampBox immutable box;
    bool public returnBomb;

    constructor(StampBox _box, bool _returnBomb) {
        box = _box;
        returnBomb = _returnBomb;
    }

    function send(address to) external payable returns (uint256) {
        return box.send{value: msg.value}(to, "hi");
    }

    receive() external payable {
        if (returnBomb) {
            assembly {
                return(0, 100000) // 100 KB of return data (fits the stipend), then the call succeeds
            }
        }
        while (true) {}
    }
}

/// @dev Tries to re-enter withdraw() while being paid by withdraw().
contract ReentrantWithdrawer {
    StampBox immutable box;
    bool public accept;
    bool public reentryBlocked;

    constructor(StampBox _box) {
        box = _box;
    }

    function send(address to) external payable returns (uint256) {
        return box.send{value: msg.value}(to, "hi");
    }

    function setAccept(bool a) external {
        accept = a;
    }

    function withdraw() external {
        box.withdraw();
    }

    receive() external payable {
        require(accept, "not yet");
        try box.withdraw() {}
        catch (bytes memory err) {
            reentryBlocked = bytes4(err) == ReentrancyGuard.ReentrancyGuardReentrantCall.selector;
        }
    }
}

contract StampBoxPayoutsTest is Test {
    StampBox box;
    address alice = makeAddr("alice"); // receiver
    address bob = makeAddr("bob");
    address rescue = makeAddr("rescue");

    function setUp() public {
        box = new StampBox();
        vm.prank(alice);
        box.openInbox(1 ether, "");
        vm.deal(bob, 10 ether);
        vm.deal(address(this), 100 ether);
    }

    function _assertSolvent() internal view {
        uint256 pending;
        for (uint256 i; i < box.stampsCount(); ++i) {
            StampBox.Stamp memory s = box.getStamp(i);
            if (s.status == StampBox.Status.Pending) pending += s.amount;
        }
        assertEq(address(box).balance, pending + box.totalOwed());
    }

    // ─────────────────────────── Rejecting sender ───────────────────────────

    function test_refund_rejectingSender_defersAndEmits() public {
        RejectingSender s = new RejectingSender(box);
        uint256 id = s.send{value: 1 ether}(alice);

        vm.expectEmit(address(box));
        emit StampBox.Settled(id, alice, StampBox.Status.Refunded, "thanks");
        vm.expectEmit(address(box));
        emit StampBox.PaymentDeferred(id, address(s), 1 ether);
        vm.prank(alice);
        box.refund(id, "thanks");

        assertEq(box.owed(address(s)), 1 ether);
        assertEq(box.totalOwed(), 1 ether);
        assertEq(box.totalRefunded(), 1 ether);
        _assertSolvent();
    }

    function test_withdrawTo_rescuesFundsForContractThatCannotReceive() public {
        RejectingSender s = new RejectingSender(box);
        uint256 id = s.send{value: 1 ether}(alice);
        vm.prank(alice);
        box.refund(id, "");

        // Plain withdraw() can't work for this contract: paying it reverts.
        vm.expectRevert(StampBox.TransferFailed.selector);
        s.withdraw();
        assertEq(box.owed(address(s)), 1 ether);

        vm.expectEmit(address(box));
        emit StampBox.Withdrawn(address(s), rescue, 1 ether);
        s.withdrawTo(rescue);
        assertEq(rescue.balance, 1 ether);
        assertEq(box.owed(address(s)), 0);
        assertEq(box.totalOwed(), 0);
        assertEq(address(box).balance, 0);
    }

    function test_reclaim_rejectingSender_defers() public {
        RejectingSender s = new RejectingSender(box);
        uint256 id = s.send{value: 1 ether}(alice);
        vm.warp(block.timestamp + 7 days);

        vm.expectEmit(address(box));
        emit StampBox.PaymentDeferred(id, address(s), 1 ether);
        s.reclaim(id);

        assertEq(uint8(box.getStamp(id).status), uint8(StampBox.Status.Reclaimed));
        assertEq(box.owed(address(s)), 1 ether);
        _assertSolvent();
    }

    // ─────────────────────────── Blocklist-style revert ───────────────────────────

    function test_blocklistedSender_refundDeferred_thenWithdrawAfterUnblock() public {
        BlocklistableWallet w = new BlocklistableWallet(box);
        uint256 id = w.send{value: 1 ether}(alice);

        vm.prank(alice);
        box.refund(id, "");
        assertEq(box.owed(address(w)), 1 ether);

        // Still blocked: withdraw reverts and the credit is preserved.
        vm.expectRevert(StampBox.TransferFailed.selector);
        w.withdraw();
        assertEq(box.owed(address(w)), 1 ether);

        w.setBlocked(false);
        w.withdraw();
        assertEq(address(w).balance, 1 ether);
        assertEq(box.owed(address(w)), 0);
        assertEq(address(box).balance, 0);
    }

    function test_unblockedSender_isPaidDirectly() public {
        BlocklistableWallet w = new BlocklistableWallet(box);
        w.setBlocked(false);
        uint256 id = w.send{value: 1 ether}(alice);
        vm.prank(alice);
        box.refund(id, "");
        assertEq(address(w).balance, 1 ether);
        assertEq(box.owed(address(w)), 0);
    }

    // ─────────────────────────── Griefing ───────────────────────────

    function test_gasBurningSender_cannotBlockRefund() public {
        GriefingSender g = new GriefingSender(box, false);
        uint256 id = g.send{value: 1 ether}(alice);

        uint256 gasBefore = gasleft();
        vm.prank(alice);
        box.refund{gas: 500_000}(id, "");
        uint256 used = gasBefore - gasleft();

        assertEq(box.owed(address(g)), 1 ether);
        assertLt(used, 300_000, "refund gas should be bounded by PAYOUT_GAS");
    }

    function test_returnBombSender_isPaidWithoutCopyingReturnData() public {
        GriefingSender g = new GriefingSender(box, true);
        uint256 id = g.send{value: 1 ether}(alice);

        vm.prank(alice);
        box.refund{gas: 300_000}(id, "");
        assertEq(address(g).balance, 1 ether);
        assertEq(box.owed(address(g)), 0);
    }

    // ─────────────────────────── Batch ───────────────────────────

    function test_batchRefund_settlesEveryStampEvenIfOnePayoutFails() public {
        RejectingSender bad = new RejectingSender(box);
        uint256[] memory ids = new uint256[](3);
        vm.prank(bob);
        ids[0] = box.send{value: 1 ether}(alice, "one");
        ids[1] = bad.send{value: 2 ether}(alice);
        vm.prank(bob);
        ids[2] = box.send{value: 3 ether}(alice, "three");

        vm.prank(alice);
        box.batchRefund(ids);

        for (uint256 i; i < 3; ++i) {
            assertEq(uint8(box.getStamp(ids[i]).status), uint8(StampBox.Status.Refunded));
        }
        assertEq(bob.balance, 10 ether);
        assertEq(box.owed(address(bad)), 2 ether);
        assertEq(address(box).balance, 2 ether);
        _assertSolvent();
    }

    // ─────────────────────────── Withdraw ───────────────────────────

    function test_revert_withdraw_nothingOwed() public {
        vm.expectRevert(StampBox.NothingOwed.selector);
        vm.prank(bob);
        box.withdraw();

        vm.expectRevert(StampBox.NothingOwed.selector);
        vm.prank(bob);
        box.withdrawTo(rescue);
    }

    function test_withdraw_accumulatesAcrossStamps() public {
        BlocklistableWallet w = new BlocklistableWallet(box);
        uint256 a = w.send{value: 1 ether}(alice);
        uint256 b = w.send{value: 2 ether}(alice);
        vm.startPrank(alice);
        box.refund(a, "");
        box.refund(b, "");
        vm.stopPrank();
        assertEq(box.owed(address(w)), 3 ether);

        w.setBlocked(false);
        w.withdraw();
        assertEq(address(w).balance, 3 ether);
    }

    function test_withdraw_reentryIsBlocked() public {
        ReentrantWithdrawer r = new ReentrantWithdrawer(box);
        uint256 id = r.send{value: 1 ether}(alice);
        vm.prank(alice);
        box.refund(id, ""); // receive() rejects -> deferred
        assertEq(box.owed(address(r)), 1 ether);

        r.setAccept(true);
        r.withdraw();
        assertTrue(r.reentryBlocked());
        assertEq(address(r).balance, 1 ether); // paid exactly once
        assertEq(box.totalOwed(), 0);
        assertEq(address(box).balance, 0);
    }

    function testFuzz_deferredRefundThenWithdraw(uint256 amount) public {
        amount = bound(amount, 1 ether, 1e30);
        vm.deal(address(this), amount);
        BlocklistableWallet w = new BlocklistableWallet(box);
        uint256 id = w.send{value: amount}(alice);
        vm.prank(alice);
        box.refund(id, "");
        assertEq(box.owed(address(w)), amount);
        _assertSolvent();
        w.setBlocked(false);
        w.withdraw();
        assertEq(address(w).balance, amount);
        assertEq(address(box).balance, 0);
    }
}
