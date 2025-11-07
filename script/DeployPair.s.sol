// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MewCatPair} from "../src/MewCatPair.sol";

contract DeployPair is Script {
    address constant MEW_TOKEN = 0x859f87DF3ea4DE9573A52Fa0695B72383a261213;
    address constant CAT_TOKEN = 0x16EB0B40deb683Da77D68f86B01a3fd0A189Cb5F;

    address constant UNISWAP_V2_FACTORY =
        0x7E0987E5b3a30e3f2828572Bb659A548460a3003;

    function run() external {
        vm.startBroadcast();

        MewCatPair deployer = new MewCatPair(MEW_TOKEN, CAT_TOKEN);
        console2.log("Deployer Contract:", address(deployer));

        address pairAddress = deployer.createPair(UNISWAP_V2_FACTORY);
        console2.log("Pair Created:", pairAddress);

        vm.stopBroadcast();
    }
}
