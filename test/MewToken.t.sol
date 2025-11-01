// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MewToken} from "../src/MewToken.sol";

contract MewTokenTest is Test {
    MewToken public token;
    address public owner;

    function setUp() public {
        owner = address(this);
        token = new MewToken(1000000);
    }

    function testInitialSupply() public {
        assertEq(token.totalSupply(), 1000000 * 10**18);
    }

    function testMint() public {
        address user = address(0x123);
        uint256 amount = 1000 * 10**18;
        
        token.mint(user, amount);
        assertEq(token.balanceOf(user), amount);
    }
}