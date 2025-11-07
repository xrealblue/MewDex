'use client';

import { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { parseUnits } from 'ethers';
import { UNISWAP_V2_MAINNET_ROUTER02_ADDRESS, TOKENS } from '@/constants/addresses';
import { ERC20_ABI, UNISWAP_V2_ROUTER_ABI } from '@/lib/contracts';

export default function LiquidityInterface() {
  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();
  
  const [tokenA, setTokenA] = useState(TOKENS.WETH.address);
  const [tokenB, setTokenB] = useState(TOKENS.CAT.address);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddLiquidity = async () => {
    if (!address || !amountA || !amountB) return;
    
    setIsLoading(true);
    try {
      // Check if this is a valid token pair (WETH-CAT or MEW-CAT)
      const validPairs = [
        [TOKENS.WETH.address, TOKENS.CAT.address],
        [TOKENS.CAT.address, TOKENS.WETH.address],
        [TOKENS.MEW.address, TOKENS.CAT.address],
        [TOKENS.CAT.address, TOKENS.MEW.address]
      ];
      
      const isValidPair = validPairs.some(pair => 
        (pair[0].toLowerCase() === tokenA.toLowerCase() && pair[1].toLowerCase() === tokenB.toLowerCase())
      );
      
      if (!isValidPair) {
        alert('Please select a valid token pair: WETH-CAT or MEW-CAT');
        setIsLoading(false);
        return;
      }
      
      // Approve both tokens
      const amountAWei = parseUnits(amountA, 18);
      const amountBWei = parseUnits(amountB, 18);

      // Approve Token A
      await writeContract({
        address: tokenA as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [UNISWAP_V2_MAINNET_ROUTER02_ADDRESS, amountAWei],
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Approve Token B
      await writeContract({
        address: tokenB as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [UNISWAP_V2_MAINNET_ROUTER02_ADDRESS, amountBWei],
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Add liquidity
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      const amountAMin = parseUnits((parseFloat(amountA) * 0.95).toString(), 18);
      const amountBMin = parseUnits((parseFloat(amountB) * 0.95).toString(), 18);

      await writeContract({
        address: UNISWAP_V2_MAINNET_ROUTER02_ADDRESS as `0x${string}`,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'addLiquidity',
        args: [
          tokenA,
          tokenB,
          amountAWei,
          amountBWei,
          amountAMin,
          amountBMin,
          address,
          deadline
        ],
      });

      alert('Liquidity added successfully!');
      setAmountA('');
      setAmountB('');
    } catch (error) {
      console.error('Add liquidity failed:', error);
      alert('Failed to add liquidity. Check console.');
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
            value={amountA}
            onChange={(e) => setAmountA(e.target.value)}
            placeholder="0.0"
            className="flex-1 p-2 border rounded"
          />
          <select
            value={tokenA}
            onChange={(e) => setTokenA(e.target.value)}
            className="p-2 border rounded"
          >
            {Object.entries(TOKENS).map(([key, token]) => (
              <option key={key} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
        
      

      
        Token B
        
          <input
            type="number"
            value={amountB}
            onChange={(e) => setAmountB(e.target.value)}
            placeholder="0.0"
            className="flex-1 p-2 border rounded"
          />
          <select
            value={tokenB}
            onChange={(e) => setTokenB(e.target.value)}
            className="p-2 border rounded"
          >
            {Object.entries(TOKENS).map(([key, token]) => (
              <option key={key} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
          
        
      

      
        {isLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
      

      
{/*         
          Note: Make sure you have both tokens in your wallet. The ratio should match the current pool ratio for optimal liquidity provision. */}
        
      </>
    
  );
}