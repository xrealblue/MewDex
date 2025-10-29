// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../lib/v2-core/contracts/UniswapV2Factory.sol";
import "../lib/v2-periphery/contracts/UniswapV2Router02.sol";
import "../src/MewToken.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying contracts...");
        console.log("Deployer:", deployer);
        
        // 1. Deploy Uniswap V2 Factory
        UniswapV2Factory factory = new UniswapV2Factory(deployer);
        console.log("Factory deployed:", address(factory));
        
        // 2. Deploy WETH (Mock for testing)
        MewToken weth = new MewToken(1000000); // 1M WETH
        console.log("WETH deployed:", address(weth));
        
        // 3. Deploy Router
        UniswapV2Router02 router = new UniswapV2Router02(
            address(factory),
            address(weth)
        );
        console.log("Router deployed:", address(router));
        
        // 4. Deploy MewToken
        MewToken mewToken = new MewToken(1000000); // 1M MEW
        console.log("MewToken deployed:", address(mewToken));
        
        // 5. Deploy another test token (DAI mock)
        MewToken dai = new MewToken(1000000); // 1M DAI
        console.log("DAI deployed:", address(dai));
        
        vm.stopBroadcast();
        
        // Save addresses to JSON
        string memory json = string(abi.encodePacked(
            '{\n',
            '  "factory": "', vm.toString(address(factory)), '",\n',
            '  "router": "', vm.toString(address(router)), '",\n',
            '  "weth": "', vm.toString(address(weth)), '",\n',
            '  "mewToken": "', vm.toString(address(mewToken)), '",\n',
            '  "dai": "', vm.toString(address(dai)), '"\n',
            '}'
        ));
        
        vm.writeFile("deployment.json", json);
        console.log("\nAll addresses saved to deployment.json");
    }
}