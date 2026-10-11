// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StampBox} from "../src/StampBox.sol";

/// @notice Deploys StampBox. No constructor args, no owner.
/// Usage (keystore account):
///   forge script script/Deploy.s.sol --rpc-url arc_mainnet --account <name> --broadcast
/// Or with DEPLOYER_PRIVATE_KEY in the environment (what `pnpm launch deploy` does; use a fresh, lightly funded wallet):
///   forge script script/Deploy.s.sol --rpc-url arc_mainnet --broadcast
contract Deploy is Script {
    function run() external returns (StampBox box) {
        uint256 key = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (key != 0) vm.startBroadcast(key);
        else vm.startBroadcast();
        box = new StampBox();
        vm.stopBroadcast();

        console.log("StampBox deployed at", address(box));
        console.log("Chain id", block.chainid);
        console.log("Block", block.number);
    }
}
