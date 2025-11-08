// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

import { IERC20 } from "../lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import { IUniswapV2Router02 } from "../lib/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract AddLiquidity is Script {
    address constant MEW_TOKEN = 0x859f87DF3ea4DE9573A52Fa0695B72383a261213;
    address constant CAT_TOKEN = 0x16EB0B40deb683Da77D68f86B01a3fd0A189Cb5F;
    address constant UNISWAP_V2_ROUTER = 0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3;
    address constant PAIR_ADDRESS = 0x8384e73328b1223cEa00C6e219ED75192919e4E0;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        IERC20 mewToken = IERC20(MEW_TOKEN);
        IERC20 catToken = IERC20(CAT_TOKEN);
        
        uint256 mewBalance = mewToken.balanceOf(deployer);
        uint256 catBalance = catToken.balanceOf(deployer);
        
        console2.log("MEW Balance:", mewBalance);
        console2.log("CAT Balance:", catBalance);

        uint256 mewAmount = 1000 * 10**18; // 1000 MEW
        uint256 catAmount = 1000 * 10**18; // 1000 CAT

        require(mewBalance >= mewAmount, "Insufficient MEW balance");
        require(catBalance >= catAmount, "Insufficient CAT balance");

        console2.log("Approving MEW...");
        mewToken.approve(UNISWAP_V2_ROUTER, mewAmount);
        
        console2.log("Approving CAT...");
        catToken.approve(UNISWAP_V2_ROUTER, catAmount);

        console2.log("Adding liquidity...");
        IUniswapV2Router02 router = IUniswapV2Router02(UNISWAP_V2_ROUTER);
        
        (uint amountA, uint amountB, uint liquidity) = router.addLiquidity(
            MEW_TOKEN,
            CAT_TOKEN,
            mewAmount,
            catAmount,
            0, // amountAMin 
            0, // amountBMin 
            deployer,
            block.timestamp + 1200
        );

        console2.log("Liquidity added successfully!");
        console2.log("MEW amount:", amountA);
        console2.log("CAT amount:", amountB);
        console2.log("LP tokens received:", liquidity);

        vm.stopBroadcast();
    }
}