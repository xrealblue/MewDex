import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, Address } from 'viem';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

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

export default function LiquidityInterface() {
  const { address } = useAccount();
  const [mewAmount, setMewAmount] = useState('');
  const [catAmount, setCatAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Get balances
  const { data: mewBalance } = useReadContract({
    address: TOKENS.MEW.address as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: catBalance } = useReadContract({
    address: TOKENS.CAT.address as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  // Check allowances
  const { data: mewAllowance, refetch: refetchMewAllowance } = useReadContract({
    address: TOKENS.MEW.address as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, ROUTER_ADDRESS as Address] : undefined,
    query: { enabled: !!address }
  });

  const { data: catAllowance, refetch: refetchCatAllowance } = useReadContract({
    address: TOKENS.CAT.address as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, ROUTER_ADDRESS as Address] : undefined,
    query: { enabled: !!address }
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

  const handleApproveMew = () => {
    reset();
    writeContract({
      address: TOKENS.MEW.address as Address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ROUTER_ADDRESS as Address, parseEther('1000000')],
    });
  };

  const handleApproveCat = () => {
    reset();
    writeContract({
      address: TOKENS.CAT.address as Address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ROUTER_ADDRESS as Address, parseEther('1000000')],
    });
  };

  const handleAddLiquidity = () => {
    if (!mewAmount || !catAmount) return;

    try {
      reset();
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

  const needsMewApproval = mewAllowance !== undefined && mewAmount && parseFloat(mewAmount) > 0 && parseEther(mewAmount) > (mewAllowance as bigint);
  const needsCatApproval = catAllowance !== undefined && catAmount && parseFloat(catAmount) > 0 && parseEther(catAmount) > (catAllowance as bigint);

  useEffect(() => {
    if (isSuccess) {
      setMewAmount('');
      setCatAmount('');
      refetchMewAllowance();
      refetchCatAllowance();
      setTimeout(() => reset(), 3000);
    }
  }, [isSuccess, refetchMewAllowance, refetchCatAllowance, reset]);

  // Calculate ratio suggestion
  useEffect(() => {
    if (reserves && token0 && mewAmount && Array.isArray(reserves)) {
      const [reserve0, reserve1] = reserves as [bigint, bigint, number];
      const isMewToken0 = (token0 as string).toLowerCase() === TOKENS.MEW.address.toLowerCase();
      const mewReserve = isMewToken0 ? reserve0 : reserve1;
      const catReserve = isMewToken0 ? reserve1 : reserve0;
      
      if (mewReserve > 0n ) {
        const ratio = Number(catReserve) / Number(mewReserve);
        const suggestedCat = parseFloat(mewAmount) * ratio;
        if (suggestedCat > 0 && !catAmount) {
          setCatAmount(suggestedCat.toFixed(6));
        }
      }
    }
  }, [mewAmount, reserves, token0, catAmount]);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* MEW Token */}
      <div className="rounded-2xl p-3 sm:p-4 md:p-5 border-2 border-black transition-colors">
        <div className="flex justify-between mb-2">
          <span className="text-black text-xs sm:text-sm font-medium">MEW Amount</span>
          <button 
            onClick={() => mewBalance && setMewAmount(formatEther(mewBalance as bigint))}
            className="text-black hover:text-black text-xs sm:text-sm font-medium transition-colors"
          >
            Balance: {mewBalance ? parseFloat(formatEther(mewBalance as bigint)).toFixed(4) : '0.0000'}
          </button>
        </div>
        <div className="flex relative items-center gap-3 pr-28 sm:pr-32">
          <input
            type="number"
            value={mewAmount}
            onChange={(e) => setMewAmount(e.target.value)}
            placeholder="0.0"
            className="flex-1 bg-transparent text-black text-2xl sm:text-3xl md:text-4xl font-bold outline-none placeholder:text-black/20"
          />
          <div className="bg-black absolute right-0 text-white px-4 py-2 sm:py-2.5 rounded-xl font-bold text-base sm:text-lg shadow-lg flex items-center gap-2">
            <span className="text-xl">{TOKENS.MEW.icon}</span>
            MEW
          </div>
        </div>
      </div>

      {/* CAT Token */}
      <div className="rounded-2xl p-3 sm:p-4 md:p-5 border-2 border-black transition-colors">
        <div className="flex justify-between mb-2">
          <span className="text-black text-xs sm:text-sm font-medium">CAT Amount</span>
          <button 
            onClick={() => catBalance && setCatAmount(formatEther(catBalance as bigint))}
            className="text-black hover:text-black text-xs sm:text-sm font-medium transition-colors"
          >
            Balance: {catBalance ? parseFloat(formatEther(catBalance as bigint)).toFixed(4) : '0.0000'}
          </button>
        </div>
        <div className="flex relative items-center gap-3 pr-28 sm:pr-32">
          <input
            type="number"
            value={catAmount}
            onChange={(e) => setCatAmount(e.target.value)}
            placeholder="0.0"
            className="flex-1 bg-transparent text-black text-2xl sm:text-3xl md:text-4xl font-bold outline-none placeholder:text-black/20"
          />
          <div className="bg-black absolute right-0 text-white px-4 py-2 sm:py-2.5 rounded-xl font-bold text-base sm:text-lg shadow-lg flex items-center gap-2">
            <span className="text-xl">{TOKENS.CAT.icon}</span>
            CAT
          </div>
        </div>
      </div>

      {/* Slippage Tolerance */}
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

      {/* Success Message */}
      {isSuccess && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-2.5 sm:p-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <p className="text-green-300 text-sm font-semibold">Liquidity added successfully!</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {needsMewApproval && (
          <button
            onClick={handleApproveMew}
            disabled={isPending || isConfirming}
            className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:from-gray-600 disabled:to-gray-700 text-black py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Approving MEW...
              </>
            ) : (
              'Approve MEW'
            )}
          </button>
        )}

        {needsCatApproval && (
          <button
            onClick={handleApproveCat}
            disabled={isPending || isConfirming}
            className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:from-gray-600 disabled:to-gray-700 text-black py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Approving CAT...
              </>
            ) : (
              'Approve CAT'
            )}
          </button>
        )}

        <button
          onClick={handleAddLiquidity}
          disabled={!mewAmount || !catAmount || needsMewApproval || needsCatApproval || isPending || isConfirming}
          className="w-full bg-black text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Adding Liquidity...
            </>
          ) : (
            'Add Liquidity'
          )}
        </button>
      </div>
    </div>
  );
}
