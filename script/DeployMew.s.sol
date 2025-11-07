// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MewToken.sol";

contract DeployMew is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying MewToken...");
        console.log("Deployer:", deployer);
        
        // Deploy MewToken
        MewToken mewToken = new MewToken(1000000); // 1M MEW
        console.log("MewToken deployed:", address(mewToken));
        
        vm.stopBroadcast();
        
        // Log the deployment address
        console.log("\nMewToken deployed successfully!");
        console.log("MewToken address:", address(mewToken));
    }
}