// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/CatToken.sol";

contract DeployCat is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying CatToken...");
        console.log("Deployer:", deployer);
        
        // Deploy CatToken
        CatToken catToken = new CatToken(1000000); // 1M CAT
        console.log("CatToken deployed:", address(catToken));
        
        vm.stopBroadcast();
        
        // Log the deployment address
        console.log("\nCatToken deployed successfully!");
        console.log("CatToken address:", address(catToken));        
    }
}