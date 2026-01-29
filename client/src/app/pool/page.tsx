'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, Contract } from 'ethers';
import { BrowserProvider } from 'ethers';
import { TOKENS, UNISWAP_V2_MAINNET_ROUTER02_ADDRESS, UNISWAP_V2_MAINNET_FACTORY_ADDRESS } from '@/constants/addresses';
import { ERC20_ABI, UNISWAP_V2_ROUTER_ABI, UNISWAP_V2_FACTORY_ABI, UNISWAP_V2_PAIR_ABI } from '@/lib/contracts';

export default function PoolPage() {
  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();
  
  const [tokenA, setTokenA] = useState(TOKENS.WETH.address);
  const [tokenB, setTokenB] = useState(TOKENS.MEW.address);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLiquidity, setUserLiquidity] = useState('0');
  const [reserves, setReserves] = useState({ reserveA: '0', reserveB: '0' });

  // Get pair address and reserves
  const fetchPairInfo = async () => {
    if (!isConnected) return;
    
    try {
      const provider = new BrowserProvider(window.ethereum);
      const factory = new Contract(UNISWAP_V2_MAINNET_FACTORY_ADDRESS, UNISWAP_V2_FACTORY_ABI, provider);
      
      // Get pair address
      const pairAddress = await factory.getPair(tokenA, tokenB);
      
      if (pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000') {
        const pair = new Contract(pairAddress, UNISWAP_V2_PAIR_ABI, provider);
        
        // Get reserves
        const [reserve0, reserve1] = await pair.getReserves();
        const token0 = await pair.token0();
        
        // Determine which token is token0 and token1
        const isTokenAToken0 = token0.toLowerCase() === tokenA.toLowerCase();
        
        setReserves({
          reserveA: formatUnits(isTokenAToken0 ? reserve0 : reserve1, 
                               isTokenAToken0 ? TOKENS.WETH.decimals : TOKENS.MEW.decimals),
          reserveB: formatUnits(isTokenAToken0 ? reserve1 : reserve0,
                               isTokenAToken0 ? TOKENS.MEW.decimals : TOKENS.WETH.decimals)
        });
        
        // Get user's liquidity
        if (address) {
          const liquidityBalance = await pair.balanceOf(address);
          setUserLiquidity(formatUnits(liquidityBalance, 18));
        }
      } else {
        setReserves({ reserveA: '0', reserveB: '0' });
        setUserLiquidity('0');
      }
    } catch (error) {
      console.error('Error fetching pair info:', error);
    }
  };

  useEffect(() => {
    fetchPairInfo();
  }, [tokenA, tokenB, address, isConnected]);

  // Calculate amount B based on amount A
  const calculateAmountB = async () => {
    if (!amountA || parseFloat(amountA) <= 0 || parseFloat(reserves.reserveA) <= 0 || parseFloat(reserves.reserveB) <= 0) {
      setAmountB('');
      return;
    }
    
    const amountBValue = (parseFloat(amountA) * parseFloat(reserves.reserveB)) / parseFloat(reserves.reserveA);
    setAmountB(amountBValue.toFixed(6));
  };

  useEffect(() => {
    calculateAmountB();
  }, [amountA, reserves]);

  const handleAddLiquidity = async () => {
    if (!address || !amountA || !amountB) return;
    
    setIsLoading(true);
    try {
      // Step 1: Approve token A
      const amountAWei = parseUnits(amountA, TOKENS.WETH.decimals);
      
      await writeContract({
        address: tokenA as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [UNISWAP_V2_MAINNET_ROUTER02_ADDRESS, amountAWei],
      });

      // Step 2: Approve token B
      const amountBWei = parseUnits(amountB, TOKENS.MEW.decimals);
      
      await writeContract({
        address: tokenB as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [UNISWAP_V2_MAINNET_ROUTER02_ADDRESS, amountBWei],
      });

      // Wait a bit for approvals
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Add liquidity
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      const slippage = 0.05; // 5% slippage
      
      const amountAMin = parseUnits((parseFloat(amountA) * (1 - slippage)).toString(), TOKENS.WETH.decimals);
      const amountBMin = parseUnits((parseFloat(amountB) * (1 - slippage)).toString(), TOKENS.MEW.decimals);

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
      fetchPairInfo();
    } catch (error) {
      console.error('Failed to add liquidity:', error);
      alert('Failed to add liquidity. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return <div className="p-4">Please connect your wallet to manage liquidity</div>;
  }

  return (
    <div className="w-full max-w-md p-4 bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-xl font-bold text-center">Liquidity Pool</h2>
      
      {parseFloat(userLiquidity) > 0 && (
        <div className="p-3 mb-4 bg-blue-50 rounded-md">
          <h3 className="font-medium">Your Liquidity</h3>
          <p>{parseFloat(userLiquidity).toFixed(6)} LP Tokens</p>
        </div>
      )}
      
      <div className="p-3 mb-4 bg-gray-50 rounded-md">
        <h3 className="font-medium">Pool Information</h3>
        <div className="flex justify-between mt-2">
          <span>Reserve {TOKENS.WETH.symbol}:</span>
          <span>{parseFloat(reserves.reserveA).toFixed(6)}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Reserve {TOKENS.MEW.symbol}:</span>
          <span>{parseFloat(reserves.reserveB).toFixed(6)}</span>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
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
        </div>
        
        <div className="flex items-center gap-2 mb-4">
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
        </div>
      </div>

      <button
        onClick={handleAddLiquidity}
        disabled={isLoading || !amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0}
        className="w-full p-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
      </button>
    </div>
  );
}