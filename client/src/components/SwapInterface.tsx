'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, Contract } from 'ethers';
import { BrowserProvider } from 'ethers';
import {  TOKENS, UNISWAP_V2_MAINNET_ROUTER02_ADDRESS } from '@/constants/addresses';
import { ERC20_ABI, UNISWAP_V2_ROUTER_ABI } from '@/lib/contracts';

export default function SwapInterface() {
  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();
  
  const [tokenIn, setTokenIn] = useState(TOKENS.WETH.address);
  const [tokenOut, setTokenOut] = useState(TOKENS.USDC.address);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get quote for swap
  const getQuote = async () => {
    if (!amountIn || parseFloat(amountIn) <= 0) return;
    
    try {
      const provider = new BrowserProvider(window.ethereum);
      const router = new Contract(UNISWAP_V2_MAINNET_ROUTER02_ADDRESS, UNISWAP_V2_ROUTER_ABI, provider);
      
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
      getQuote();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [amountIn, tokenIn, tokenOut]);

  const handleSwap = async () => {
    if (!address || !amountIn) return;
    
    setIsLoading(true);
    try {
      // Step 1: Approve token
      const amountInWei = parseUnits(amountIn, 18);
      
      await writeContract({
        address: tokenIn as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [UNISWAP_V2_MAINNET_ROUTER02_ADDRESS, amountInWei],
      });

      // Wait a bit for approval
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Execute swap
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      const amountOutMin = parseUnits((parseFloat(amountOut) * 0.95).toString(), 6); // 5% slippage

      await writeContract({
        address: UNISWAP_V2_MAINNET_ROUTER02_ADDRESS as `0x${string}`,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [
          amountInWei,
          amountOutMin,
          [tokenIn, tokenOut],
          address,
          deadline
        ],
      });

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

  if (!isConnected) {
    return "Please connect your wallet";
  }

  return (
    <>
   
        
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
          
        
      

      
        <button
          onClick={() => {
            const temp = tokenIn;
            setTokenIn(tokenOut);
            setTokenOut(temp);
          }}
          className="text-blue-500 hover:text-blue-700"
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

          
        
      

      
        {isLoading ? 'Swapping...' : 'Swap'}
      </>
    
  );
}