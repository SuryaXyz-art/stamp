// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Deploy} from "../script/Deploy.s.sol";
import {StampBox} from "../src/StampBox.sol";

contract DeployTest is Test {
    function test_deployScript() public {
        StampBox box = new Deploy().run();
        assertGt(address(box).code.length, 0);
        assertEq(box.stampsCount(), 0);
        assertEq(box.TIMEOUT(), 7 days);
    }
}
