// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StampBox} from "../src/StampBox.sol";

/// @notice Deploys StampBox. No constructor args, no owner.
/// Usage (keystore account, never a raw key in code):
///   forge script script/Deploy.s.sol --rpc-url arc_testnet --account <name> --broadcast
contract Deploy is Script {
    function run() external returns (StampBox box) {
        vm.startBroadcast();
        box = new StampBox();
        vm.stopBroadcast();

        console.log("StampBox deployed at", address(box));
        console.log("Chain id", block.chainid);
        console.log("Block", block.number);
    }
}
