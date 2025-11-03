'use client';

import { useState, useEffect } from 'react';
import { parseUnits, formatUnits } from 'ethers';
import { TOKENS, UNISWAP_V2_MAINNET_ROUTER02_ADDRESS } from '@/constants/addresses';
import { ERC20_ABI, UNISWAP_V2_ROUTER_ABI } from '@/lib/contracts';
import web3Provider from '@/lib/web3Provider';

export default function SwapInterface() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [tokenIn, setTokenIn] = useState(TOKENS.WETH.address);
  const [tokenOut, setTokenOut] = useState(TOKENS.USDC.address);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Connect wallet
  const connectWallet = async () => {
    try {
      const { address, isConnected } = await web3Provider.connect();
      setAddress(address);
      setIsConnected(isConnected);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  // Check if already connected on component mount
  useEffect(() => {
    if (web3Provider.isConnected) {
      setAddress(web3Provider.address);
      setIsConnected(web3Provider.isConnected);
    }
  }, []);

  // Get quote for swap
  const getQuote = async () => {
    if (!amountIn || parseFloat(amountIn) <= 0 || !isConnected) return;
    
    try {
      const router = await web3Provider.getContract(
        UNISWAP_V2_MAINNET_ROUTER02_ADDRESS, 
        UNISWAP_V2_ROUTER_ABI
      );
      
      const amountInWei = parseUnits(amountIn, 18);
      const path = [tokenIn, tokenOut];
      
      const amounts = await router.getAmountsOut(amountInWei, path);
      setAmountOut(formatUnits(amounts[1], 6)); // Assuming USDC output
    } catch (error) {
      console.error('Error getting quote:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isConnected) {
        getQuote();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [amountIn, tokenIn, tokenOut, isConnected]);

  const handleSwap = async () => {
    if (!address || !amountIn) return;
    
    setIsLoading(true);
    try {
      // Step 1: Approve token
      const amountInWei = parseUnits(amountIn, 18);
      
      const tokenContract = await web3Provider.getContract(tokenIn, ERC20_ABI);
      const approveTx = await tokenContract.approve(UNISWAP_V2_MAINNET_ROUTER02_ADDRESS, amountInWei);
      await approveTx.wait();

      // Wait a bit for approval
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Execute swap
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      const amountOutMin = parseUnits((parseFloat(amountOut) * 0.95).toString(), 6); // 5% slippage

      const router = await web3Provider.getContract(
        UNISWAP_V2_MAINNET_ROUTER02_ADDRESS, 
        UNISWAP_V2_ROUTER_ABI
      );
      
      const swapTx = await router.swapExactTokensForTokens(
        amountInWei,
        amountOutMin,
        [tokenIn, tokenOut],
        address,
        deadline
      );
      
      await swapTx.wait();

      alert('Swap successful!');
      setAmountIn('');
      setAmountOut('');
    } catch (error) {
      console.error('Swap failed:', error);
      alert('Swap failed. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-4 bg-white rounded-lg shadow-md">
      {!isConnected ? (
        <div className="text-center">
          <p className="mb-4">Please connect your wallet to use the swap interface</p>
          <button 
            onClick={connectWallet}
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="number"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.0"
                className="flex-1 p-2 border rounded"
              />
              <select
                value={tokenIn}
                onChange={(e) => setTokenIn(e.target.value)}
                className="p-2 border rounded"
              >
                {Object.entries(TOKENS).map(([key, token]) => (
                  <option key={key} value={token.address}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-center my-2">
              <button
                onClick={() => {
                  const temp = tokenIn;
                  setTokenIn(tokenOut);
                  setTokenOut(temp);
                }}
                className="p-1 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                ↓↑
              </button>
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={amountOut}
                readOnly
                placeholder="0.0"
                className="flex-1 p-2 border rounded bg-gray-50"
              />
              <select
                value={tokenOut}
                onChange={(e) => setTokenOut(e.target.value)}
                className="p-2 border rounded"
              >
                {Object.entries(TOKENS).map(([key, token]) => (
                  <option key={key} value={token.address}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleSwap}
            disabled={isLoading || !amountIn || parseFloat(amountIn) <= 0}
            className="w-full p-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Swapping...' : 'Swap'}
          </button>
        </>
      )}
    </div>
  );
}
