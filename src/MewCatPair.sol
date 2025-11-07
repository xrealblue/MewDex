// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IUniswapV2Factory } from "../lib/v2-core/contracts/interfaces/IUniswapV2Factory.sol"; 
import { IUniswapV2Pair } from "../lib/v2-core/contracts/interfaces/IUniswapV2Pair.sol";   

contract MewCatPair {
    address public factory;
    address public mewToken;
    address public catToken;
    address public pair;
    
    event PairCreated(address indexed pair, address token0, address token1);
    
    constructor(address _mewToken, address _catToken) {
        mewToken = _mewToken;
        catToken = _catToken;
    }
    
    function createPair(address _factory) external returns (address pairAddress) {
        require(pair == address(0), "Pair already created");
        factory = _factory;
        
        IUniswapV2Factory factoryContract = IUniswapV2Factory(_factory);
        pairAddress = factoryContract.createPair(mewToken, catToken);
        pair = pairAddress;
        
        emit PairCreated(pairAddress, mewToken, catToken);
    }
    
    function getPair(address _factory) external view returns (address) {
        IUniswapV2Factory factoryContract = IUniswapV2Factory(_factory);
        return factoryContract.getPair(mewToken, catToken);
    }
    
  
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) {
        require(pair != address(0), "Pair not created");
        return IUniswapV2Pair(pair).getReserves();
    }
}

contract MewCatLiquidityHelper {
    address public immutable mewToken;
    address public immutable catToken;
    address public immutable pair;
    
    constructor(address _mewToken, address _catToken, address _pair) {
        mewToken = _mewToken;
        catToken = _catToken;
        pair = _pair;
    }
    
    function calculateOptimalAmounts(
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin
    ) external view returns (uint amountA, uint amountB) {
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();
        
        if (reserve0 == 0 && reserve1 == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            address token0 = IUniswapV2Pair(pair).token0();
            
            if (token0 == mewToken) {
                uint amountBOptimal = quote(amountADesired, reserve0, reserve1);
                if (amountBOptimal <= amountBDesired) {
                    require(amountBOptimal >= amountBMin, "INSUFFICIENT_B_AMOUNT");
                    (amountA, amountB) = (amountADesired, amountBOptimal);
                } else {
                    uint amountAOptimal = quote(amountBDesired, reserve1, reserve0);
                    require(amountAOptimal <= amountADesired && amountAOptimal >= amountAMin, "INSUFFICIENT_A_AMOUNT");
                    (amountA, amountB) = (amountAOptimal, amountBDesired);
                }
            } else {
                uint amountBOptimal = quote(amountADesired, reserve1, reserve0);
                if (amountBOptimal <= amountBDesired) {
                    require(amountBOptimal >= amountBMin, "INSUFFICIENT_B_AMOUNT");
                    (amountA, amountB) = (amountADesired, amountBOptimal);
                } else {
                    uint amountAOptimal = quote(amountBDesired, reserve0, reserve1);
                    require(amountAOptimal <= amountADesired && amountAOptimal >= amountAMin, "INSUFFICIENT_A_AMOUNT");
                    (amountA, amountB) = (amountAOptimal, amountBDesired);
                }
            }
        }
    }
    
    function quote(uint amountA, uint reserveA, uint reserveB) internal pure returns (uint amountB) {
        require(amountA > 0, "INSUFFICIENT_AMOUNT");
        require(reserveA > 0 && reserveB > 0, "INSUFFICIENT_LIQUIDITY");
        amountB = (amountA * reserveB) / reserveA;
    }
    
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public pure returns (uint amountOut) {
        require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }
}
