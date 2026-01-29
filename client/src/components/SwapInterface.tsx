'use client'
import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, Address } from 'viem';
import { ArrowDownUp, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
const ROUTER_ADDRESS = '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3';
const FACTORY_ADDRESS = '0xF62c03E08ada871A0bEb309762E260a7a6a880E6';
const PAIR_ADDRESS = '0xD6632E37d6d266ef4a7f5a9A8E2e21F9D0064807';
const TOKENS = {
  MEW: {
    address: '0x859f87DF3ea4DE9573A52Fa0695B72383a261213',
    symbol: 'MEW',
    decimals: 18,
    icon: '🐱'
  },
  CAT: {
    address: '0x16EB0B40deb683Da77D68f86B01a3fd0A189Cb5F',
    symbol: 'CAT',
    decimals: 18,
    icon: '🐈'
  },
};

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

export default function SwapInterface() {
  const { address } = useAccount();
  const [fromToken, setFromToken] = useState<'MEW' | 'CAT'>('MEW');
  const [toToken, setToToken] = useState<'CAT' | 'MEW'>('CAT');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Get balances
  const { data: fromBalance } = useReadContract({
    address: TOKENS[fromToken].address as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: toBalance } = useReadContract({
    address: TOKENS[toToken].address as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  // Check allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: TOKENS[fromToken].address as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, ROUTER_ADDRESS as Address] : undefined,
    query: { enabled: !!address }
  });

  // Get expected output amount
  const { data: amountsOut, isError: priceError, isLoading: priceLoading } = useReadContract({
    address: ROUTER_ADDRESS as Address,
    abi: ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: fromAmount && parseFloat(fromAmount) > 0 
      ? [parseEther(fromAmount), [TOKENS[fromToken].address, TOKENS[toToken].address]] 
      : undefined,
    query: {
      enabled: !!fromAmount && parseFloat(fromAmount) > 0,
      refetchInterval: 10000,
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
      reset();
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
      reset();
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

  const needsApproval = allowance !== undefined && fromAmount && parseFloat(fromAmount) > 0 && parseEther(fromAmount) > (allowance as bigint);

  useEffect(() => {
    if (isSuccess) {
      setFromAmount('');
      setToAmount('');
      refetchAllowance();
      setTimeout(() => reset(), 3000);
    }
  }, [isSuccess, refetchAllowance, reset]);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* From Token */}
      <div className=" rounded-2xl p-3 sm:p-4 md:p-5 border-2 border-black transition-colors">
        <div className="flex justify-between mb-2">
          <span className="text-black text-xs sm:text-sm font-medium">From</span>
          <button 
            onClick={() => fromBalance && setFromAmount(formatEther(fromBalance as bigint))}
            className="text-black hover:text-black text-xs sm:text-sm font-medium transition-colors"
          >
            Balance: {fromBalance ? parseFloat(formatEther(fromBalance as bigint)).toFixed(4) : '0.0000'}
          </button>
        </div>
        <div className="flex relative items-center gap-3 pr-28 sm:pr-32">
          <input
            type="number"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            placeholder="0.0"
            className="flex-1 bg-transparent text-black text-2xl sm:text-3xl md:text-4xl font-bold outline-none placeholder:text-black/20"
          />
          <button
            onClick={() => {
              const newFrom = fromToken === 'MEW' ? 'CAT' : 'MEW';
              setFromToken(newFrom as 'MEW' | 'CAT');
              setToToken(fromToken);
              setFromAmount('');
              setToAmount('');
            }}
            className="bg-black absolute right-0 text-white px-4 py-2 sm:py-2.5 rounded-xl font-bold text-base sm:text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <span className="text-xl">{TOKENS[fromToken].icon}</span>
            {fromToken}
          </button>
        </div>
      </div>

      {/* Switch Button */}
      <div className="flex justify-center  relative z-10">
        <button
          onClick={switchTokens}
          className="bg-black p-2 sm:p-3 rounded-full "
        >
          <ArrowDownUp className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* To Token */}
      <div className=" rounded-2xl p-3 sm:p-4 md:p-5 border-2 border-black">
        <div className="flex justify-between mb-2">
          <span className="text-black text-xs sm:text-sm font-medium">To</span>
          <span className="text-black text-xs sm:text-sm font-medium">
            Balance: {toBalance ? parseFloat(formatEther(toBalance as bigint)).toFixed(4) : '0.0000'}
          </span>
        </div>
        <div className="flex relative items-center gap-3 pr-28 sm:pr-32">
          <input
            type="number"
            value={toAmount}
            readOnly
            placeholder="0.0"
            className="flex-1 bg-transparent text-black text-2xl sm:text-3xl md:text-4xl font-bold outline-none placeholder:text-black/20"
          />
          <div className="bg-black absolute right-0 text-white px-4 py-2 sm:py-2.5 rounded-xl font-bold text-base sm:text-lg shadow-lg flex items-center gap-2">
            <span className="text-xl">{TOKENS[toToken].icon}</span>
            {toToken}
          </div>
        </div>
        {priceLoading && (
          <div className="flex items-center gap-2 mt-2 text-black text-sm">
            <Loader2 className="w-3 h-3 animate-spin" />
            Fetching price...
          </div>
        )}
      </div>

      {/* Price Impact & Slippage */}
      <div className="bg-black rounded-xl p-3 sm:p-4 border border-purple-500/20">
        <div className="flex justify-between items-center">
          <span className="text-white text-sm font-medium">Slippage Tolerance</span>
          <div className="flex gap-2">
            {['0.5', '1.0', '3.0'].map((val) => (
              <button
                key={val}
                onClick={() => setSlippage(val)}
                className={`px-2 sm:px-3 py-1 rounded-lg text-sm font-bold transition-all ${
                  slippage === val 
                    ? 'bg-white text-black' 
                    : 'bg-yellow-100/80 text-black hover:bg-yellow-100'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {priceError && fromAmount && parseFloat(fromAmount) > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2.5 sm:p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 text-sm font-semibold">Unable to fetch price</p>
            <p className="text-red-400/80 text-xs mt-1">Check if pool has liquidity or try a smaller amount</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {isSuccess && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-2.5 sm:p-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <p className="text-green-300 text-sm font-semibold">Transaction successful!</p>
        </div>
      )}

      {/* Action Button */}
      {needsApproval ? (
        <button
          onClick={handleApprove}
          disabled={isPending || isConfirming}
          className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:from-gray-600 disabled:to-gray-700 text-black py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Approving...
            </>
          ) : (
            `Approve ${fromToken}`
          )}
        </button>
      ) : (
        <button
          onClick={handleSwap}
          disabled={!fromAmount || !toAmount || isPending || isConfirming || priceError}
          className="w-full bg-black text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Swapping...
            </>
          ) : (
            'Swap Tokens'
          )}
        </button>
      )}
    </div>
  );
}
