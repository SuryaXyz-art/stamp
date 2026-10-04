// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StampBox} from "../src/StampBox.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev Malicious receiver: when paid out by `keep`, tries to settle another stamp again.
contract MaliciousReceiver {
    StampBox immutable box;
    uint256 public targetId;
    bool public reentryBlocked;
    bool public reentered;

    constructor(StampBox _box) {
        box = _box;
    }

    function open() external {
        box.openInbox(1 ether, "evil");
    }

    function keep(uint256 id, uint256 target) external {
        targetId = target;
        box.keep(id);
    }

    function batchKeep(uint256[] calldata ids, uint256 target) external {
        targetId = target;
        box.batchKeep(ids);
    }

    receive() external payable {
        if (reentered) return;
        reentered = true;
        try box.keep(targetId) {}
        catch (bytes memory err) {
            reentryBlocked = bytes4(err) == ReentrancyGuard.ReentrancyGuardReentrantCall.selector;
        }
    }
}

/// @dev Malicious sender: when refunded, tries to reclaim the same stamp (double spend).
contract MaliciousSender {
    StampBox immutable box;
    uint256 public id;
    bool public reentryBlocked;
    bool public propagate;

    constructor(StampBox _box) {
        box = _box;
    }

    function send(address to) external payable {
        id = box.send{value: msg.value}(to, "gm");
    }

    function setPropagate(bool p) external {
        propagate = p;
    }

    receive() external payable {
        if (propagate) {
            box.reclaim(id); // bubble the revert up so the whole refund fails
        } else {
            try box.reclaim(id) {}
            catch (bytes memory err) {
                reentryBlocked = bytes4(err) == ReentrancyGuard.ReentrancyGuardReentrantCall.selector;
            }
        }
    }
}

contract ReentrancyTest is Test {
    StampBox box;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        box = new StampBox();
        vm.deal(bob, 10 ether);
        vm.deal(alice, 10 ether);
    }

    function test_maliciousReceiver_cannotDoubleKeep() public {
        MaliciousReceiver evil = new MaliciousReceiver(box);
        evil.open();
        vm.startPrank(bob);
        uint256 a = box.send{value: 1 ether}(address(evil), "one");
        uint256 b = box.send{value: 1 ether}(address(evil), "two");
        vm.stopPrank();

        evil.keep(a, b);

        assertTrue(evil.reentered());
        assertTrue(evil.reentryBlocked());
        assertEq(uint8(box.getStamp(a).status), uint8(StampBox.Status.Kept));
        assertEq(uint8(box.getStamp(b).status), uint8(StampBox.Status.Pending));
        assertEq(address(evil).balance, 1 ether);
        assertEq(address(box).balance, 1 ether); // b still escrowed
    }

    function test_maliciousReceiver_batchKeepReentryBlocked() public {
        MaliciousReceiver evil = new MaliciousReceiver(box);
        evil.open();
        vm.startPrank(bob);
        uint256[] memory ids = new uint256[](1);
        ids[0] = box.send{value: 1 ether}(address(evil), "one");
        uint256 other = box.send{value: 1 ether}(address(evil), "two");
        vm.stopPrank();

        evil.batchKeep(ids, other);

        assertTrue(evil.reentryBlocked());
        assertEq(uint8(box.getStamp(other).status), uint8(StampBox.Status.Pending));
        assertEq(address(box).balance, 1 ether);
    }

    function test_maliciousSender_cannotReclaimDuringRefund() public {
        vm.prank(alice);
        box.openInbox(1 ether, "");
        MaliciousSender evil = new MaliciousSender(box);
        evil.send{value: 1 ether}(alice);
        uint256 id = evil.id();
        vm.warp(block.timestamp + 8 days); // reclaim would otherwise be allowed

        vm.prank(alice);
        box.refund(id, "");

        assertTrue(evil.reentryBlocked());
        assertEq(address(evil).balance, 1 ether); // paid exactly once
        assertEq(address(box).balance, 0);
        assertEq(uint8(box.getStamp(id).status), uint8(StampBox.Status.Refunded));
    }

    function test_maliciousSender_propagatedRevertRollsBack() public {
        vm.prank(alice);
        box.openInbox(1 ether, "");
        MaliciousSender evil = new MaliciousSender(box);
        evil.send{value: 1 ether}(alice);
        evil.setPropagate(true);
        uint256 id = evil.id();

        vm.expectRevert(StampBox.TransferFailed.selector);
        vm.prank(alice);
        box.refund(id, "");

        // State unchanged; receiver can still mark it spam.
        assertEq(uint8(box.getStamp(id).status), uint8(StampBox.Status.Pending));
        vm.prank(alice);
        box.keep(id);
        assertEq(address(box).balance, 0);
    }
}
