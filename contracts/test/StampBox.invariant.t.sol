// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StampBox} from "../src/StampBox.sol";

/// @dev Drives random valid sequences of send / refund / keep / reclaim / batch / price changes.
contract Handler is Test {
    StampBox public box;
    address[] public actors;
    uint256 public sumPendingGhost;

    constructor(StampBox _box) {
        box = _box;
        for (uint256 i; i < 4; ++i) {
            address a = makeAddr(string(abi.encodePacked("actor", vm.toString(i))));
            actors.push(a);
            vm.deal(a, 1e30);
            vm.prank(a);
            box.openInbox(1 ether, "");
        }
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function send(uint256 fromSeed, uint256 toSeed, uint256 extra) external {
        address from = _actor(fromSeed);
        address to = _actor(toSeed);
        if (from == to) to = _actor(toSeed % actors.length + 1);
        uint256 amount = box.priceOf(to) + bound(extra, 0, 100 ether);
        vm.prank(from);
        box.send{value: amount}(to, "hi");
        sumPendingGhost += amount;
    }

    function setPrice(uint256 actorSeed, uint256 price) external {
        vm.prank(_actor(actorSeed));
        box.setPrice(bound(price, 1, 50 ether));
    }

    function _pendingIdFor(uint256 seed) internal view returns (bool found, uint256 id) {
        uint256 n = box.stampsCount();
        if (n == 0) return (false, 0);
        for (uint256 i; i < n; ++i) {
            id = (seed % n + i) % n;
            if (box.getStamp(id).status == StampBox.Status.Pending) return (true, id);
        }
    }

    function refund(uint256 seed) external {
        (bool found, uint256 id) = _pendingIdFor(seed);
        if (!found) return;
        StampBox.Stamp memory s = box.getStamp(id);
        vm.prank(s.to);
        box.refund(id, "ok");
        sumPendingGhost -= s.amount;
    }

    function keep(uint256 seed) external {
        (bool found, uint256 id) = _pendingIdFor(seed);
        if (!found) return;
        StampBox.Stamp memory s = box.getStamp(id);
        vm.prank(s.to);
        box.keep(id);
        sumPendingGhost -= s.amount;
    }

    function reclaim(uint256 seed) external {
        (bool found, uint256 id) = _pendingIdFor(seed);
        if (!found) return;
        StampBox.Stamp memory s = box.getStamp(id);
        if (block.timestamp < s.sentAt + 7 days) vm.warp(s.sentAt + 7 days);
        vm.prank(s.from);
        box.reclaim(id);
        sumPendingGhost -= s.amount;
    }

    function batchKeep(uint256 seed) external {
        (bool found, uint256 id) = _pendingIdFor(seed);
        if (!found) return;
        StampBox.Stamp memory s = box.getStamp(id);
        uint256[] memory ids = new uint256[](1);
        ids[0] = id;
        vm.prank(s.to);
        box.batchKeep(ids);
        sumPendingGhost -= s.amount;
    }

    function batchRefund(uint256 seed) external {
        (bool found, uint256 id) = _pendingIdFor(seed);
        if (!found) return;
        StampBox.Stamp memory s = box.getStamp(id);
        uint256[] memory ids = new uint256[](1);
        ids[0] = id;
        vm.prank(s.to);
        box.batchRefund(ids);
        sumPendingGhost -= s.amount;
    }
}

contract StampBoxInvariantTest is Test {
    StampBox box;
    Handler handler;

    function setUp() public {
        box = new StampBox();
        handler = new Handler(box);
        targetContract(address(handler));
    }

    /// @notice The contract holds exactly the sum of Pending stamps — never more, never less.
    function invariant_balanceEqualsPending() public view {
        uint256 sum;
        uint256 n = box.stampsCount();
        for (uint256 i; i < n; ++i) {
            StampBox.Stamp memory s = box.getStamp(i);
            if (s.status == StampBox.Status.Pending) sum += s.amount;
        }
        assertEq(address(box).balance, sum);
        assertEq(sum, handler.sumPendingGhost());
    }

    /// @notice Lifetime counters reconcile with the escrowed balance.
    function invariant_totalsReconcile() public view {
        assertEq(box.totalSent() - box.totalRefunded() - box.totalKept() - box.totalReclaimed(), address(box).balance);
    }

    /// @notice Every stamp is indexed exactly once in its receiver's inbox and sender's outbox.
    function invariant_indexesComplete() public view {
        uint256 inboxTotal;
        uint256 outboxTotal;
        for (uint256 i; i < 4; ++i) {
            address a = handler.actors(i);
            inboxTotal += box.inboxCount(a);
            outboxTotal += box.outboxCount(a);
        }
        assertEq(inboxTotal, box.stampsCount());
        assertEq(outboxTotal, box.stampsCount());
    }
}
