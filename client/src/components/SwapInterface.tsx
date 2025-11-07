'use client'

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, Address } from 'viem';
import { sepolia } from 'wagmi/chains';

// Contract addresses
const ROUTER_ADDRESS = '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24';
const FACTORY_ADDRESS = '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6';

const TOKENS = {
  MEW: {
    address: '0x859f87DF3ea4DE9573A52Fa0695B72383a261213',
    symbol: 'MEW',
    decimals: 18
  },
  CAT: {
    address: '0x16EB0B40deb683Da77D68f86B01a3fd0A189Cb5F',
    symbol: 'CAT',
    decimals: 18
  },
};

const PAIR_ADDRESS = '0x8384e73328b1223cEa00C6e219ED75192919e4E0';

// ABIs
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const ROUTER_ABI = [
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' }
    ],
    name: 'getAmountsOut',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'amountADesired', type: 'uint256' },
      { name: 'amountBDesired', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' },
      { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    name: 'addLiquidity',
    outputs: [
      { name: 'amountA', type: 'uint256' },
      { name: 'amountB', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' }
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

const PAIR_ABI = [
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];

export default function DEXInterface() {
  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity'>('swap');
  const { address, isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          {/* Tabs */}
          <div className="flex border-b border-white/20">
            <button
              onClick={() => setActiveTab('swap')}
              className={`flex-1 py-4 text-lg font-semibold transition-all ${
                activeTab === 'swap'
                  ? 'bg-white/20 text-white border-b-2 border-blue-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              Swap
            </button>
            <button
              onClick={() => setActiveTab('liquidity')}
              className={`flex-1 py-4 text-lg font-semibold transition-all ${
                activeTab === 'liquidity'
                  ? 'bg-white/20 text-white border-b-2 border-blue-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              Add Liquidity
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!isConnected ? (
              <div className="text-center py-12">
                <p className="text-white/80 text-lg">Please connect your wallet to continue</p>
              </div>
            ) : activeTab === 'swap' ? (
              <SwapInterface />
            ) : (
              <LiquidityInterface />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SwapInterface() {
  const { address } = useAccount();
  const [fromToken, setFromToken] = useState<'MEW' | 'CAT'>('MEW');
  const [toToken, setToToken] = useState<'CAT' | 'MEW'>('CAT');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Get balances
  const { data: fromBalance } = useReadContract({
    address: TOKENS[fromToken].address as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
  });

  const { data: toBalance } = useReadContract({
    address: TOKENS[toToken].address as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
  });

  // Check allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: TOKENS[fromToken].address as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address!, ROUTER_ADDRESS as Address],
  });

  // Get expected output amount
  const { data: amountsOut, isError, isLoading } = useReadContract({
    address: ROUTER_ADDRESS as Address,
    abi: ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: fromAmount && parseFloat(fromAmount) > 0 ? [parseEther(fromAmount), [TOKENS[fromToken].address, TOKENS[toToken].address]] : undefined,
    query: {
      enabled: !!fromAmount && parseFloat(fromAmount) > 0,
    }
  });

  useEffect(() => {
    if (amountsOut && Array.isArray(amountsOut) && amountsOut.length > 1) {
      const outputAmount = formatEther(amountsOut[1] as bigint);
      setToAmount(parseFloat(outputAmount).toFixed(6));
    } else if (!fromAmount || parseFloat(fromAmount) === 0) {
      setToAmount('');
    }
  }, [amountsOut, fromAmount]);

  const handleApprove = async () => {
    try {
      writeContract({
        address: TOKENS[fromToken].address as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ROUTER_ADDRESS as Address, parseEther('1000000')],
      });
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const handleSwap = async () => {
    if (!fromAmount || !toAmount) return;

    try {
      const amountIn = parseEther(fromAmount);
      const amountOutMin = parseEther(toAmount) * BigInt(10000 - Math.floor(parseFloat(slippage) * 100)) / BigInt(10000);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

      writeContract({
        address: ROUTER_ADDRESS as Address,
        abi: ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [
          amountIn,
          amountOutMin,
          [TOKENS[fromToken].address, TOKENS[toToken].address],
          address!,
          deadline,
        ],
      });
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };

  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount('');
    setToAmount('');
  };

  const needsApproval = allowance !== undefined && fromAmount && parseEther(fromAmount) > (allowance as bigint);

  useEffect(() => {
    if (isSuccess) {
      setFromAmount('');
      setToAmount('');
      refetchAllowance();
    }
  }, [isSuccess, refetchAllowance]);

  return (
    <div className="space-y-4">
      {/* From Token */}
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div className="flex justify-between mb-2">
          <span className="text-white/60 text-sm">From</span>
          <span className="text-white/60 text-sm">
            Balance: {fromBalance ? parseFloat(formatEther(fromBalance as bigint)).toFixed(4) : '0'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            placeholder="0.0"
            className="flex-1 bg-transparent text-white text-2xl outline-none"
          />
          <select
            value={fromToken}
            onChange={(e) => {
              const newFrom = e.target.value as 'MEW' | 'CAT';
              setFromToken(newFrom);
              setToToken(newFrom === 'MEW' ? 'CAT' : 'MEW');
            }}
            className="bg-white/10 text-white px-4 py-2 rounded-xl font-semibold cursor-pointer hover:bg-white/20 transition-colors"
          >
            <option value="MEW">MEW</option>
            <option value="CAT">CAT</option>
          </select>
        </div>
      </div>

      {/* Switch Button */}
      <div className="flex justify-center">
        <button
          onClick={switchTokens}
          className="bg-white/10 p-3 rounded-xl hover:bg-white/20 transition-all hover:rotate-180 duration-300"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* To Token */}
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div className="flex justify-between mb-2">
          <span className="text-white/60 text-sm">To</span>
          <span className="text-white/60 text-sm">
            Balance: {toBalance ? parseFloat(formatEther(toBalance as bigint)).toFixed(4) : '0'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={toAmount}
            readOnly
            placeholder="0.0"
            className="flex-1 bg-transparent text-white text-2xl outline-none"
          />
          <div className="bg-white/10 text-white px-4 py-2 rounded-xl font-semibold">
            {toToken}
          </div>
        </div>
      </div>

      {/* Slippage - Simple buttons only */}
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-white/80 text-sm">Slippage Tolerance</span>
          <div className="flex gap-2">
            {['0.5', '1.0', '3.0'].map((val) => (
              <button
                key={val}
                onClick={() => setSlippage(val)}
                className={`px-4 py-1 rounded-lg text-sm font-medium ${
                  slippage === val ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Swap Button */}
      {needsApproval ? (
        <button
          onClick={handleApprove}
          disabled={isPending || isConfirming}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending || isConfirming ? 'Approving...' : `Approve ${fromToken}`}
        </button>
      ) : (
        <button
          onClick={handleSwap}
          disabled={!fromAmount || !toAmount || isPending || isConfirming}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending || isConfirming ? 'Swapping...' : isSuccess ? 'Swap Successful!' : 'Swap'}
        </button>
      )}
    </div>
  );
}

function LiquidityInterface() {
  const { address } = useAccount();
  const [mewAmount, setMewAmount] = useState('');
  const [catAmount, setCatAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Get balances
  const { data: mewBalance } = useReadContract({
    address: TOKENS.MEW.address as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
  });

  const { data: catBalance } = useReadContract({
    address: TOKENS.CAT.address as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
  });

  // Check allowances
  const { data: mewAllowance, refetch: refetchMewAllowance } = useReadContract({
    address: TOKENS.MEW.address as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address!, ROUTER_ADDRESS as Address],
  });

  const { data: catAllowance, refetch: refetchCatAllowance } = useReadContract({
    address: TOKENS.CAT.address as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address!, ROUTER_ADDRESS as Address],
  });

  // Get reserves
  const { data: reserves } = useReadContract({
    address: PAIR_ADDRESS as Address,
    abi: PAIR_ABI,
    functionName: 'getReserves',
  });

  const { data: token0 } = useReadContract({
    address: PAIR_ADDRESS as Address,
    abi: PAIR_ABI,
    functionName: 'token0',
  });

  const handleApproveMew = async () => {
    writeContract({
      address: TOKENS.MEW.address as Address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ROUTER_ADDRESS as Address, parseEther('1000000')],
    });
  };

  const handleApproveCat = async () => {
    writeContract({
      address: TOKENS.CAT.address as Address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ROUTER_ADDRESS as Address, parseEther('1000000')],
    });
  };

  const handleAddLiquidity = async () => {
    if (!mewAmount || !catAmount) return;

    try {
      const amountMew = parseEther(mewAmount);
      const amountCat = parseEther(catAmount);
      const slippageFactor = BigInt(10000 - Math.floor(parseFloat(slippage) * 100));
      const amountMewMin = (amountMew * slippageFactor) / BigInt(10000);
      const amountCatMin = (amountCat * slippageFactor) / BigInt(10000);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

      writeContract({
        address: ROUTER_ADDRESS as Address,
        abi: ROUTER_ABI,
        functionName: 'addLiquidity',
        args: [
          TOKENS.MEW.address,
          TOKENS.CAT.address,
          amountMew,
          amountCat,
          amountMewMin,
          amountCatMin,
          address!,
          deadline,
        ],
      });
    } catch (error) {
      console.error('Add liquidity failed:', error);
    }
  };

  const needsMewApproval = mewAllowance !== undefined && mewAmount && parseEther(mewAmount) > (mewAllowance as bigint);
  const needsCatApproval = catAllowance !== undefined && catAmount && parseEther(catAmount) > (catAllowance as bigint);

  useEffect(() => {
    if (isSuccess) {
      setMewAmount('');
      setCatAmount('');
      refetchMewAllowance();
      refetchCatAllowance();
    }
  }, [isSuccess, refetchMewAllowance, refetchCatAllowance]);

  // Calculate ratio suggestion
  useEffect(() => {
    if (reserves && token0 && mewAmount && Array.isArray(reserves)) {
      const [reserve0, reserve1] = reserves as [bigint, bigint, number];
      const isMewToken0 = (token0 as string).toLowerCase() === TOKENS.MEW.address.toLowerCase();
      const mewReserve = isMewToken0 ? reserve0 : reserve1;
      const catReserve = isMewToken0 ? reserve1 : reserve0;
      
      if (mewReserve > 0n) {
        const ratio = Number(catReserve) / Number(mewReserve);
        const suggestedCat = parseFloat(mewAmount) * ratio;
        if (suggestedCat > 0 && !catAmount) {
          setCatAmount(suggestedCat.toFixed(6));
        }
      }
    }
  }, [mewAmount, reserves, token0, catAmount]);

  return (
    <div className="space-y-4">
      {reserves && Array.isArray(reserves) && (
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <h3 className="text-white font-semibold mb-2">Pool Reserves</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/60">MEW:</span>
              <span className="text-white ml-2">
                {formatEther(token0 && (token0 as string).toLowerCase() === TOKENS.MEW.address.toLowerCase() 
                  ? (reserves[0] as bigint) 
                  : (reserves[1] as bigint)).slice(0, 10)}
              </span>
            </div>
            <div>
              <span className="text-white/60">CAT:</span>
              <span className="text-white ml-2">
                {formatEther(token0 && (token0 as string).toLowerCase() === TOKENS.MEW.address.toLowerCase() 
                  ? (reserves[1] as bigint) 
                  : (reserves[0] as bigint)).slice(0, 10)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MEW Input */}
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div className="flex justify-between mb-2">
          <span className="text-white/60 text-sm">MEW Amount</span>
          <span className="text-white/60 text-sm">
            Balance: {mewBalance ? parseFloat(formatEther(mewBalance as bigint)).toFixed(4) : '0'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={mewAmount}
            onChange={(e) => setMewAmount(e.target.value)}
            placeholder="0.0"
            className="flex-1 bg-transparent text-white text-2xl outline-none"
          />
          <div className="bg-white/10 text-white px-4 py-2 rounded-xl font-semibold">
            MEW
          </div>
        </div>
      </div>

      {/* CAT Input */}
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div className="flex justify-between mb-2">
          <span className="text-white/60 text-sm">CAT Amount</span>
          <span className="text-white/60 text-sm">
            Balance: {catBalance ? parseFloat(formatEther(catBalance as bigint)).toFixed(4) : '0'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={catAmount}
            onChange={(e) => setCatAmount(e.target.value)}
            placeholder="0.0"
            className="flex-1 bg-transparent text-white text-2xl outline-none"
          />
          <div className="bg-white/10 text-white px-4 py-2 rounded-xl font-semibold">
            CAT
          </div>
        </div>
      </div>

      {/* Slippage - Simple buttons only */}
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-white/80 text-sm">Slippage Tolerance</span>
          <div className="flex gap-2">
            {['0.5', '1.0', '3.0'].map((val) => (
              <button
                key={val}
                onClick={() => setSlippage(val)}
                className={`px-4 py-1 rounded-lg text-sm font-medium ${
                  slippage === val ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {needsMewApproval && (
          <button
            onClick={handleApproveMew}
            disabled={isPending || isConfirming}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isPending || isConfirming ? 'Approving...' : 'Approve MEW'}
          </button>
        )}
        
        {needsCatApproval && (
          <button
            onClick={handleApproveCat}
            disabled={isPending || isConfirming}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isPending || isConfirming ? 'Approving...' : 'Approve CAT'}
          </button>
        )}

        {!needsMewApproval && !needsCatApproval && (
          <button
            onClick={handleAddLiquidity}
            disabled={!mewAmount || !catAmount || isPending || isConfirming}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || isConfirming ? 'Adding Liquidity...' : isSuccess ? 'Liquidity Added!' : 'Add Liquidity'}
          </button>
        )}
      </div>
    </div>
  );
}