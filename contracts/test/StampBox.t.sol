// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StampBox} from "../src/StampBox.sol";

/// @dev Native USDC on Arc has 18 decimals, so `1 ether` == $1.00.
contract StampBoxTest is Test {
    StampBox box;

    address alice = makeAddr("alice"); // receiver
    address bob = makeAddr("bob"); // sender
    address carol = makeAddr("carol"); // another sender / stranger

    uint256 constant PRICE = 1 ether;

    event InboxOpened(address indexed user, uint256 price, string bio);
    event PriceSet(address indexed user, uint256 price);
    event Sent(uint256 indexed id, address indexed from, address indexed to, uint256 amount, string message);
    event Settled(uint256 indexed id, address indexed by, StampBox.Status status, string reply);

    function setUp() public {
        box = new StampBox();
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
        vm.prank(alice);
        box.openInbox(PRICE, "Founder @X - pitch me");
    }

    function _send(address from, string memory message) internal returns (uint256) {
        vm.prank(from);
        return box.send{value: PRICE}(alice, message);
    }

    function _assertStamp(uint256 id, address from, address to, uint256 amount, StampBox.Status status) internal view {
        StampBox.Stamp memory s = box.getStamp(id);
        assertEq(s.from, from);
        assertEq(s.to, to);
        assertEq(s.amount, amount);
        assertEq(uint8(s.status), uint8(status));
    }

    // ─────────────────────────────── Inbox setup ──────────────────────────────

    function test_openInbox() public {
        vm.expectEmit(address(box));
        emit InboxOpened(carol, 5 ether, "hi");
        vm.prank(carol);
        box.openInbox(5 ether, "hi");
        assertEq(box.priceOf(carol), 5 ether);
        assertEq(box.bioOf(carol), "hi");
    }

    function test_openInbox_reconfigures() public {
        vm.prank(alice);
        box.openInbox(2 ether, "new bio");
        assertEq(box.priceOf(alice), 2 ether);
        assertEq(box.bioOf(alice), "new bio");
    }

    function test_openInbox_bioAtLimit() public {
        vm.prank(carol);
        box.openInbox(1, string(new bytes(160)));
        assertEq(bytes(box.bioOf(carol)).length, 160);
    }

    function test_revert_openInbox_zeroPrice() public {
        vm.expectRevert(StampBox.InvalidPrice.selector);
        vm.prank(carol);
        box.openInbox(0, "");
    }

    function test_revert_openInbox_bioTooLong() public {
        vm.expectRevert(StampBox.BioTooLong.selector);
        vm.prank(carol);
        box.openInbox(1 ether, string(new bytes(161)));
    }

    function test_setPrice() public {
        vm.expectEmit(address(box));
        emit PriceSet(alice, 3 ether);
        vm.prank(alice);
        box.setPrice(3 ether);
        assertEq(box.priceOf(alice), 3 ether);
    }

    function test_revert_setPrice_zero() public {
        vm.expectRevert(StampBox.InvalidPrice.selector);
        vm.prank(alice);
        box.setPrice(0);
    }

    function test_revert_setPrice_closedInbox() public {
        vm.expectRevert(StampBox.InboxClosed.selector);
        vm.prank(carol);
        box.setPrice(1 ether);
    }

    function test_closeInbox() public {
        vm.expectEmit(address(box));
        emit PriceSet(alice, 0);
        vm.prank(alice);
        box.closeInbox();
        assertEq(box.priceOf(alice), 0);
    }

    function test_revert_closeInbox_alreadyClosed() public {
        vm.expectRevert(StampBox.InboxClosed.selector);
        vm.prank(carol);
        box.closeInbox();
    }

    // ────────────────────────────────── Send ──────────────────────────────────

    function test_send() public {
        vm.expectEmit(address(box));
        emit Sent(0, bob, alice, PRICE, "hello alice");
        uint256 id = _send(bob, "hello alice");

        assertEq(id, 0);
        assertEq(address(box).balance, PRICE);
        assertEq(bob.balance, 99 ether);
        _assertStamp(id, bob, alice, PRICE, StampBox.Status.Pending);
        assertEq(box.getStamp(id).sentAt, block.timestamp);
        assertEq(box.stampsCount(), 1);
        assertEq(box.inboxCount(alice), 1);
        assertEq(box.outboxCount(bob), 1);
        assertEq(box.totalSent(), PRICE);
    }

    function test_send_overpayIsWholeStamp() public {
        vm.prank(bob);
        uint256 id = box.send{value: 3 ether}(alice, "tip included");
        assertEq(box.getStamp(id).amount, 3 ether);
        assertEq(address(box).balance, 3 ether);
    }

    function test_send_messageAtLimit() public {
        vm.prank(bob);
        box.send{value: PRICE}(alice, string(new bytes(1000)));
        assertEq(box.stampsCount(), 1);
    }

    function test_send_priceChangeDoesNotAffectExisting() public {
        uint256 id = _send(bob, "hi");
        vm.prank(alice);
        box.setPrice(50 ether);
        assertEq(box.getStamp(id).amount, PRICE);
    }

    function test_revert_send_closedInbox() public {
        vm.expectRevert(StampBox.InboxClosed.selector);
        vm.prank(bob);
        box.send{value: PRICE}(carol, "hi");
    }

    function test_revert_send_afterClose() public {
        vm.prank(alice);
        box.closeInbox();
        vm.expectRevert(StampBox.InboxClosed.selector);
        _send(bob, "hi");
    }

    function test_revert_send_underpaid() public {
        vm.expectRevert(StampBox.StampTooSmall.selector);
        vm.prank(bob);
        box.send{value: PRICE - 1}(alice, "hi");
    }

    function test_revert_send_self() public {
        vm.deal(alice, 1 ether);
        vm.expectRevert(StampBox.SelfSend.selector);
        vm.prank(alice);
        box.send{value: PRICE}(alice, "me");
    }

    function test_revert_send_emptyMessage() public {
        vm.expectRevert(StampBox.EmptyMessage.selector);
        _send(bob, "");
    }

    function test_revert_send_messageTooLong() public {
        vm.expectRevert(StampBox.MessageTooLong.selector);
        vm.prank(bob);
        box.send{value: PRICE}(alice, string(new bytes(1001)));
    }

    // ───────────────────────────────── Refund ─────────────────────────────────

    function test_refund() public {
        uint256 id = _send(bob, "hi");

        vm.expectEmit(address(box));
        emit Settled(id, alice, StampBox.Status.Refunded, "thanks, let's talk");
        vm.prank(alice);
        box.refund(id, "thanks, let's talk");

        assertEq(bob.balance, 100 ether);
        assertEq(address(box).balance, 0);
        assertEq(box.totalRefunded(), PRICE);
        _assertStamp(id, bob, alice, PRICE, StampBox.Status.Refunded);
    }

    function test_refund_emptyReply() public {
        uint256 id = _send(bob, "hi");
        vm.prank(alice);
        box.refund(id, "");
        assertEq(bob.balance, 100 ether);
    }

    function test_revert_refund_replyTooLong() public {
        uint256 id = _send(bob, "hi");
        vm.expectRevert(StampBox.MessageTooLong.selector);
        vm.prank(alice);
        box.refund(id, string(new bytes(1001)));
    }

    function test_revert_refund_notReceiver() public {
        uint256 id = _send(bob, "hi");
        vm.expectRevert(StampBox.NotReceiver.selector);
        vm.prank(bob);
        box.refund(id, "");
    }

    function test_revert_refund_invalidId() public {
        vm.expectRevert(StampBox.InvalidId.selector);
        vm.prank(alice);
        box.refund(42, "");
    }

    function test_revert_refund_twice() public {
        uint256 id = _send(bob, "hi");
        vm.startPrank(alice);
        box.refund(id, "");
        vm.expectRevert(StampBox.AlreadySettled.selector);
        box.refund(id, "");
        vm.stopPrank();
    }

    function test_revert_refund_senderCannotReceive() public {
        // A contract sender with no receive() cannot be refunded; the receiver can still keep it.
        NoReceive sender = new NoReceive();
        vm.deal(address(sender), 1 ether);
        vm.prank(address(sender));
        uint256 id = box.send{value: PRICE}(alice, "hi");

        vm.expectRevert(StampBox.TransferFailed.selector);
        vm.prank(alice);
        box.refund(id, "");

        vm.prank(alice);
        box.keep(id);
        assertEq(alice.balance, PRICE);
    }

    // ────────────────────────────────── Keep ──────────────────────────────────

    function test_keep() public {
        uint256 id = _send(bob, "buy my token");

        vm.expectEmit(address(box));
        emit Settled(id, alice, StampBox.Status.Kept, "");
        vm.prank(alice);
        box.keep(id);

        assertEq(alice.balance, PRICE);
        assertEq(address(box).balance, 0);
        assertEq(box.totalKept(), PRICE);
        _assertStamp(id, bob, alice, PRICE, StampBox.Status.Kept);
    }

    function test_revert_keep_notReceiver() public {
        uint256 id = _send(bob, "hi");
        vm.expectRevert(StampBox.NotReceiver.selector);
        vm.prank(carol);
        box.keep(id);
    }

    function test_revert_keep_afterRefund() public {
        uint256 id = _send(bob, "hi");
        vm.startPrank(alice);
        box.refund(id, "");
        vm.expectRevert(StampBox.AlreadySettled.selector);
        box.keep(id);
        vm.stopPrank();
    }

    function test_settle_worksAfterInboxClosed() public {
        uint256 a = _send(bob, "one");
        uint256 b = _send(carol, "two");
        vm.startPrank(alice);
        box.closeInbox();
        box.refund(a, "");
        box.keep(b);
        vm.stopPrank();
        assertEq(bob.balance, 100 ether);
        assertEq(alice.balance, PRICE);
    }

    // ───────────────────────────────── Reclaim ────────────────────────────────

    function test_reclaim() public {
        uint256 id = _send(bob, "hi");
        vm.warp(block.timestamp + 7 days);

        vm.expectEmit(address(box));
        emit Settled(id, bob, StampBox.Status.Reclaimed, "");
        vm.prank(bob);
        box.reclaim(id);

        assertEq(bob.balance, 100 ether);
        assertEq(box.totalReclaimed(), PRICE);
        _assertStamp(id, bob, alice, PRICE, StampBox.Status.Reclaimed);
    }

    function test_revert_reclaim_tooEarly() public {
        uint256 id = _send(bob, "hi");
        vm.warp(block.timestamp + 7 days - 1);
        vm.expectRevert(StampBox.TooEarly.selector);
        vm.prank(bob);
        box.reclaim(id);
    }

    function test_revert_reclaim_notSender() public {
        uint256 id = _send(bob, "hi");
        vm.warp(block.timestamp + 7 days);
        vm.expectRevert(StampBox.NotSender.selector);
        vm.prank(carol);
        box.reclaim(id);
    }

    function test_revert_reclaim_afterKeep() public {
        uint256 id = _send(bob, "hi");
        vm.prank(alice);
        box.keep(id);
        vm.warp(block.timestamp + 7 days);
        vm.expectRevert(StampBox.AlreadySettled.selector);
        vm.prank(bob);
        box.reclaim(id);
    }

    function test_revert_receiverActsAfterReclaim() public {
        uint256 id = _send(bob, "hi");
        vm.warp(block.timestamp + 7 days);
        vm.prank(bob);
        box.reclaim(id);
        vm.expectRevert(StampBox.AlreadySettled.selector);
        vm.prank(alice);
        box.refund(id, "");
    }

    function test_receiverCanStillSettleAfterTimeout() public {
        uint256 id = _send(bob, "hi");
        vm.warp(block.timestamp + 30 days);
        vm.prank(alice);
        box.refund(id, "sorry, late");
        assertEq(bob.balance, 100 ether);
    }

    // ────────────────────────────────── Batch ─────────────────────────────────

    function _sendMany(uint256 n) internal returns (uint256[] memory ids) {
        ids = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            ids[i] = _send(i % 2 == 0 ? bob : carol, "batch");
        }
    }

    function test_batchRefund() public {
        uint256[] memory ids = _sendMany(4);
        vm.prank(alice);
        box.batchRefund(ids);
        assertEq(bob.balance, 100 ether);
        assertEq(carol.balance, 100 ether);
        assertEq(address(box).balance, 0);
        for (uint256 i; i < ids.length; ++i) {
            assertEq(uint8(box.getStamp(ids[i]).status), uint8(StampBox.Status.Refunded));
        }
    }

    function test_batchKeep() public {
        uint256[] memory ids = _sendMany(4);
        vm.prank(alice);
        box.batchKeep(ids);
        assertEq(alice.balance, 4 * PRICE);
        assertEq(box.totalKept(), 4 * PRICE);
        assertEq(address(box).balance, 0);
    }

    function test_batch_empty() public {
        vm.startPrank(alice);
        box.batchKeep(new uint256[](0));
        box.batchRefund(new uint256[](0));
        vm.stopPrank();
        assertEq(alice.balance, 0);
    }

    function test_revert_batchKeep_duplicateIsAllOrNothing() public {
        uint256[] memory ids = _sendMany(2);
        ids[1] = ids[0];
        vm.expectRevert(StampBox.AlreadySettled.selector);
        vm.prank(alice);
        box.batchKeep(ids);
        assertEq(uint8(box.getStamp(ids[0]).status), uint8(StampBox.Status.Pending));
    }

    function test_revert_batchRefund_foreignStamp() public {
        uint256[] memory ids = _sendMany(2);
        vm.prank(carol);
        box.openInbox(PRICE, "");
        vm.prank(bob);
        ids[1] = box.send{value: PRICE}(carol, "to carol");

        vm.expectRevert(StampBox.NotReceiver.selector);
        vm.prank(alice);
        box.batchRefund(ids);
    }

    // ────────────────────────────────── Views ─────────────────────────────────

    function test_inboxOutboxPagination() public {
        _sendMany(5); // ids 0..4, bob sends 0,2,4 and carol sends 1,3

        uint256[] memory page = box.inboxOf(alice, 1, 3);
        assertEq(page.length, 3);
        assertEq(page[0], 1);
        assertEq(page[2], 3);

        assertEq(box.inboxOf(alice, 3, 100).length, 2); // clamps to end
        assertEq(box.inboxOf(alice, 5, 10).length, 0); // offset at end
        assertEq(box.inboxOf(alice, 0, type(uint256).max).length, 5); // no overflow
        assertEq(box.inboxOf(carol, 0, 10).length, 0);

        uint256[] memory sent = box.outboxOf(bob, 0, 10);
        assertEq(sent.length, 3);
        assertEq(sent[1], 2);
        assertEq(box.outboxCount(carol), 2);
    }

    function test_revert_getStamp_invalidId() public {
        vm.expectRevert(StampBox.InvalidId.selector);
        box.getStamp(0);
    }

    function test_publicStampsGetter() public {
        _send(bob, "hi");
        (address from, address to, uint128 amount,, StampBox.Status status) = box.stamps(0);
        assertEq(from, bob);
        assertEq(to, alice);
        assertEq(amount, PRICE);
        assertEq(uint8(status), 0);
    }

    function test_constants() public view {
        assertEq(box.TIMEOUT(), 7 days);
        assertEq(box.MAX_MESSAGE_BYTES(), 1000);
        assertEq(box.MAX_BIO_BYTES(), 160);
    }

    // ─────────────────────────────────── Fuzz ─────────────────────────────────

    function testFuzz_sendAndRefund(uint256 price, uint256 amount) public {
        price = bound(price, 1, 1e30);
        amount = bound(amount, price, 1e30);
        vm.prank(alice);
        box.setPrice(price);
        vm.deal(bob, amount);

        vm.prank(bob);
        uint256 id = box.send{value: amount}(alice, "fuzz");
        assertEq(box.getStamp(id).amount, amount);
        assertEq(address(box).balance, amount);

        vm.prank(alice);
        box.refund(id, "");
        assertEq(bob.balance, amount);
        assertEq(address(box).balance, 0);
    }

    function testFuzz_underpaidReverts(uint256 price, uint256 amount) public {
        price = bound(price, 1, 1e30);
        amount = bound(amount, 0, price - 1);
        vm.prank(alice);
        box.setPrice(price);
        vm.deal(bob, amount);

        vm.expectRevert(StampBox.StampTooSmall.selector);
        vm.prank(bob);
        box.send{value: amount}(alice, "fuzz");
    }

    function testFuzz_keepPaysReceiver(uint256 amount) public {
        amount = bound(amount, PRICE, 1e30);
        vm.deal(bob, amount);
        vm.prank(bob);
        uint256 id = box.send{value: amount}(alice, "spam");
        vm.prank(alice);
        box.keep(id);
        assertEq(alice.balance, amount);
    }

    function testFuzz_reclaimTiming(uint256 elapsed) public {
        elapsed = bound(elapsed, 0, 365 days);
        uint256 id = _send(bob, "hi");
        vm.warp(block.timestamp + elapsed);
        if (elapsed < 7 days) vm.expectRevert(StampBox.TooEarly.selector);
        vm.prank(bob);
        box.reclaim(id);
    }

    function testFuzz_messageLength(uint256 len) public {
        len = bound(len, 0, 2000);
        if (len == 0) vm.expectRevert(StampBox.EmptyMessage.selector);
        else if (len > 1000) vm.expectRevert(StampBox.MessageTooLong.selector);
        vm.prank(bob);
        box.send{value: PRICE}(alice, string(new bytes(len)));
    }
}

contract NoReceive {}
