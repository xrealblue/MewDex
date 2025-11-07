'use client';

import { useState, useEffect } from 'react';
import { parseUnits, formatUnits, toBigInt } from 'ethers';
import { UNISWAP_V2_MAINNET_ROUTER02_ADDRESS, TOKENS } from '@/constants/addresses';
import { UNISWAP_V2_ROUTER_ABI, ERC20_ABI } from '@/lib/contracts';
import { ArrowDownIcon } from '@heroicons/react/24/outline';
import web3Provider from '@/lib/web3Provider';

const tokens = [
  { symbol: 'WETH', address: TOKENS.WETH, decimals: 18 },
  { symbol: 'MEW', address: TOKENS.MEW, decimals: 18 },
  { symbol: 'CAT', address: TOKENS.CAT, decimals: 18 },
];

export default function SwapInterface() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [inputToken, setInputToken] = useState(tokens[0]); // WETH
  const [outputToken, setOutputToken] = useState(tokens[1]); // MEW
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [isApproving, setIsApproving] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState('');
  const [inputBalance, setInputBalance] = useState<string>('0');
  const [outputBalance, setOutputBalance] = useState<string>('0');
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));

  // Initialize connection state
  useEffect(() => {
    const checkConnection = async () => {
      if (web3Provider.isConnected) {
        setAddress(web3Provider.address);
        setIsConnected(true);
        fetchBalances();
        fetchAllowance();
      }
    };
    
    checkConnection();
  }, []);

  // Fetch token balances
  const fetchBalances = async () => {
    if (!isConnected || !address) return;
    
    try {
      // Fetch input token balance
      if (inputToken.symbol === 'WETH') {
        const ethBalance = await web3Provider.provider?.getBalance(address);
        if (ethBalance) {
          setInputBalance(formatUnits(ethBalance, 18));
        }
      } else {
        const tokenContract = await web3Provider.getContract(inputToken.address.address, ERC20_ABI);
      const balance = await tokenContract.balanceOf(address);
      setInputBalance(formatUnits(balance, inputToken.decimals));
      }
      
      // Fetch output token balance
      if (outputToken.symbol === 'WETH') {
        const ethBalance = await web3Provider.provider?.getBalance(address);
        if (ethBalance) {
          setOutputBalance(formatUnits(ethBalance, 18));
        }
      } else {
        const tokenContract = await web3Provider.getContract(outputToken.address.address, ERC20_ABI);
        const balance = await tokenContract.balanceOf(address);
        setOutputBalance(formatUnits(balance, outputToken.decimals));
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  // Fetch token allowance
  const fetchAllowance = async () => {
    if (!isConnected || !address || inputToken.symbol === 'WETH') return;         
    
    try {
      const tokenContract = await web3Provider.getContract(inputToken.address.address, ERC20_ABI);
      const currentAllowance = await tokenContract.allowance(address, UNISWAP_V2_MAINNET_ROUTER02_ADDRESS);
      setAllowance(currentAllowance);
    } catch (error) {
      console.error('Error fetching allowance:', error);
    }
  };

  // Update balances and allowance when tokens change
  useEffect(() => {
    fetchBalances();
    fetchAllowance();
  }, [inputToken, outputToken, isConnected, address]);

  // Get quote
  const getQuote = async () => {
    if (!inputAmount || parseFloat(inputAmount) === 0) {
      setOutputAmount('');
      return;
    }

    try {
      if (!web3Provider.isConnected) return;
      
      // Get router contract
      const routerContract = await web3Provider.getContract(
        UNISWAP_V2_MAINNET_ROUTER02_ADDRESS,
        UNISWAP_V2_ROUTER_ABI
      );
      
      // Convert input amount to wei
      const amountIn = parseUnits(inputAmount, inputToken.decimals);
      
      // Path is an array of token addresses
      const path = [inputToken.address.address, outputToken.address.address];
      
      // Call getAmountsOut to get the expected output amount
      const amounts = await routerContract.getAmountsOut(amountIn, path);
      
      // Format the output amount
      const formattedOutput = formatUnits(amounts[1], outputToken.decimals);
      setOutputAmount(formattedOutput);
    } catch (error) {
      console.error('Error getting quote:', error);
      
      // Check if it's a "no liquidity pool" error
      if (error.message?.includes('INSUFFICIENT_LIQUIDITY') || 
          error.message?.includes('INVALID_PATH') ||
          error.message?.includes('revert')) {
        setError('No liquidity pool available for this token pair. You may need to create one first.');
        setOutputAmount('0');
      } else {
        // For other errors, show a simple 1:1 ratio as fallback
        setOutputAmount(inputAmount);
        setError('');
      }
    }
  };

  // Update quote when input amount changes
  useEffect(() => {
    getQuote();
  }, [inputAmount, inputToken, outputToken]);

  // Connect wallet
  const connectWallet = async () => {
    try {
      const { address, isConnected } = await web3Provider.connect();
      setAddress(address);
      setIsConnected(isConnected);
      fetchBalances();
      fetchAllowance();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setError('Failed to connect wallet');
    }
  };

  // Handle token swap
  const handleSwap = async () => {
    if (!isConnected) {
      await connectWallet();
      return;
    }

    if (!inputAmount || parseFloat(inputAmount) === 0) {
      setError('Please enter an amount');
      return;
    }

    try {
      setError('');
      
      // Convert input amount to wei
      const amountIn = parseUnits(inputAmount, inputToken.decimals);
      
      // Calculate minimum output amount based on slippage
      const minOutputAmount = toBigInt(parseUnits(outputAmount, outputToken.decimals)) * (toBigInt(1000 - Math.floor(slippage * 10)))/(toBigInt(1000));

      // Check if approval is needed for ERC20 tokens (not needed for ETH)
      if (inputToken.symbol !== 'WETH') {             
        if (allowance < amountIn) {
          setIsApproving(true);
          
          const tokenContract = await web3Provider.getContract(inputToken.address.address, ERC20_ABI);
          const approveTx = await tokenContract.approve(UNISWAP_V2_MAINNET_ROUTER02_ADDRESS, amountIn);
          await approveTx.wait();
          
          // Update allowance
          await fetchAllowance();
          setIsApproving(false);
        }
      }

      // Execute swap
      setIsSwapping(true);
      
      // Path is an array of token addresses
      const path = [inputToken.address.address, outputToken.address.address];
      
      // Deadline is 20 minutes from now
      const deadline = Math.floor(Date.now() / 1000) + 20 * 60;

      const routerContract = await web3Provider.getContract(
        UNISWAP_V2_MAINNET_ROUTER02_ADDRESS,
        UNISWAP_V2_ROUTER_ABI
      );

      let tx;
      if (inputToken.symbol === 'WETH') {
        // If input is WETH, use swapExactETHForTokens
        tx = await routerContract.swapExactETHForTokens(
          minOutputAmount,
          path,
          address,
          deadline,
          { value: amountIn }
        );
      } else if (outputToken.symbol === 'WETH') {
        // If output is WETH, use swapExactTokensForETH
        tx = await routerContract.swapExactTokensForETH(
          amountIn,
          minOutputAmount,
          path,
          address,
          deadline
        );
      } else {
        // Otherwise use swapExactTokensForTokens
        tx = await routerContract.swapExactTokensForTokens(
          amountIn,
          minOutputAmount,
          path,
          address,
          deadline
        );
      }

      await tx.wait();
      
      // Update balances
      await fetchBalances();
      
      setIsSwapping(false);
      
      // Reset input amount
      setInputAmount('');
      setOutputAmount('');
      
    } catch (error) {
      console.error('Swap failed:', error);
      setError('Swap failed. Check console for details.');
      setIsSwapping(false);
      setIsApproving(false);
    }
  };

  // Swap token positions
  const swapTokenPositions = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Swap Tokens</h2>
      
      {/* Input token */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">From</label>
          {isConnected && (
            <span className="text-sm text-gray-500">
              Balance: {parseFloat(inputBalance).toFixed(4)} {inputToken.symbol}
            </span>
          )}
        </div>
        <div className="flex items-center">
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.0"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          />
          <select
            value={inputToken.symbol}
            onChange={(e) => setInputToken(tokens.find(t => t.symbol === e.target.value) || tokens[0])}
            className="ml-2 block rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          >
            {tokens.map((token) => (
              <option key={token.symbol} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Swap direction button */}
      <div className="flex justify-center my-4">
        <button
          onClick={swapTokenPositions}
          className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"
        >
          <ArrowDownIcon className="h-6 w-6 text-gray-600" />
        </button>
      </div>

      {/* Output token */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">To</label>
          {isConnected && (
            <span className="text-sm text-gray-500">
              Balance: {parseFloat(outputBalance).toFixed(4)} {outputToken.symbol}
            </span>
          )}
        </div>
        <div className="flex items-center">
          <input
            type="number"
            value={outputAmount}
            readOnly
            placeholder="0.0"
            className="block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          />
          <select
            value={outputToken.symbol}
            onChange={(e) => setOutputToken(tokens.find(t => t.symbol === e.target.value) || tokens[1])}
            className="ml-2 block rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          >
            {tokens.map((token) => (
              <option key={token.symbol} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}

      {/* Swap button */}
      <div>
        <button
          onClick={handleSwap}
          disabled={isApproving || isSwapping || (!inputAmount || parseFloat(inputAmount) === 0)}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {!isConnected
            ? 'Connect Wallet'
            : isApproving
            ? 'Approving...'
            : isSwapping
            ? 'Swapping...'
            : 'Swap'}
        </button>
      </div>
    </div>
  );
}
