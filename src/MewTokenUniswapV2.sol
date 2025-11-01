// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// So this contract is just a middleman contract between the Uniswap V2 router contract and my extra logic and custom fees ownership control. This is the only contract it's a middleman when I have to add my custom features to Uniswap V2 router contract. We are not deploying this contract because we are just gonna use Uniswap V2 router contract and factory contract just that are already deployed.

import { IERC20 } from "../lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import { IUniswapV2Router02 } from "../lib/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { IUniswapV2Factory } from "../lib/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

contract UniversalUniswapV2DEX {
    IUniswapV2Router02 public immutable uniswapRouter;
    IUniswapV2Factory public immutable uniswapFactory;
    address public owner;
    
    event LiquidityAdded(address indexed token0, address indexed token1, uint256 amount0, uint256 amount1);
    event TokensSwapped(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    
    constructor(address _router, address _factory) {
        uniswapRouter = IUniswapV2Router02(_router);
        uniswapFactory = IUniswapV2Factory(_factory);
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    function addLiquidityETH(
        address token,
        uint256 tokenAmount,
        uint256 tokenMin,
        uint256 ethMin
    ) external payable {
        IERC20(token).transferFrom(msg.sender, address(this), tokenAmount);
        
        IERC20(token).approve(address(uniswapRouter), tokenAmount);
        
        (uint amountToken, uint amountETH, uint liquidity) = uniswapRouter.addLiquidityETH{value: msg.value}(
            token,
            tokenAmount,
            tokenMin,
            ethMin,
            msg.sender,
            block.timestamp
        );
        
        emit LiquidityAdded(token, uniswapRouter.WETH(), amountToken, amountETH);
    }
    
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 amountAMin,
        uint256 amountBMin
    ) external {

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);
        
        IERC20(tokenA).approve(address(uniswapRouter), amountA);
        IERC20(tokenB).approve(address(uniswapRouter), amountB);
        
        (uint amountAUsed, uint amountBUsed, uint liquidity) = uniswapRouter.addLiquidity(
            tokenA,
            tokenB,
            amountA,
            amountB,
            amountAMin,
            amountBMin,
            msg.sender, 
            block.timestamp + 300
        );
        
        emit LiquidityAdded(tokenA, tokenB, amountAUsed, amountBUsed);
    }
    
    function swapETHForTokens(
        address tokenOut,
        uint256 amountOutMin
    ) external payable {
        address[] memory path = new address[](2);
        path[0] = uniswapRouter.WETH();
        path[1] = tokenOut;
        
        uint[] memory amounts = uniswapRouter.swapExactETHForTokens{value: msg.value}(
            amountOutMin,
            path,
            msg.sender,
            block.timestamp + 300
        );
        
        emit TokensSwapped(path[0], path[1], amounts[0], amounts[1]);
    }
    
    function swapTokensForETH(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin
    ) external {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = uniswapRouter.WETH();
        
        uint[] memory amounts = uniswapRouter.swapExactTokensForETH(
            amountIn,
            amountOutMin,
            path,
            msg.sender,
            block.timestamp + 300
        );
        
        emit TokensSwapped(path[0], path[1], amounts[0], amounts[1]);
    }

    function swapTokenForToken(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = uniswapRouter.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            msg.sender,
            block.timestamp + 300
        );
        
        emit TokensSwapped(path[0], path[1], amounts[0], amounts[1]);
    }
    
    function swapTokenForTokenViaETH(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
        
        address[] memory path = new address[](3);
        path[0] = tokenIn;
        path[1] = uniswapRouter.WETH();
        path[2] = tokenOut;
        
        uint[] memory amounts = uniswapRouter.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            msg.sender,
            block.timestamp + 300
        );
        
        emit TokensSwapped(path[0], path[2], amounts[0], amounts[2]);
    }
    
    function getPairAddress(address tokenA, address tokenB) external view returns (address pair) {
        return uniswapFactory.getPair(tokenA, tokenB);
    }
    
    function getAmountsOut(uint256 amountIn, address[] memory path) 
        external 
        view 
        returns (uint[] memory amounts) 
    {
        return uniswapRouter.getAmountsOut(amountIn, path);
    }
    
    function hasPairWithETH(address token) external view returns (bool) {
        address pair = uniswapFactory.getPair(token, uniswapRouter.WETH());
        return pair != address(0);
    }
    
    
    function withdrawETH() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(owner, balance);
    }
    
    receive() external payable {}
}