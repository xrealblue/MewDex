'use client'

import { useState } from 'react';
import { useAccount } from 'wagmi';
import LiquidityInterface from './LiquidityInterface';
import SwapInterface from './SwapInterface';

const ROUTER_ADDRESS = '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3';

export default function DEXInterface() {
  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity'>('swap');
  const { address, isConnected } = useAccount();

  return (
    <div className="min-h-screen pixel w-full max-w-screen px-3 sm:px-4 py-6 sm:py-8">
      <div className="max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center  my-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl pixel font-bold text-black mb-2">
            🐱MewSwap🐈
          </h1>
          <p className="text-black text-sm sm:text-base">Swap MEW & CAT tokens on Sepolia</p>
        </div>

        {/* Main Card */}
        <div className=" overflow-hidden border-2 rounded-3xl  border-black">
          {/* Tabs */}
          <div className="flex border-b border-purple-500/20 ">
            <button
              onClick={() => setActiveTab('swap')}
              className={`flex-1 py-3 sm:py-4 text-sm sm:text-base font-bold transition-all relative ${
                activeTab === 'swap'
                  ? 'text-black'
                  : 'text-black/70'
              }`}
            >
              {activeTab === 'swap' && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50" />
              )}
              🔄 Swap
            </button>
            <button
              onClick={() => setActiveTab('liquidity')}
              className={`flex-1 py-3 sm:py-4 text-sm sm:text-base font-bold transition-all relative ${
                activeTab === 'liquidity'
                  ? 'text-black'
                  : 'text-black/70'
              }`}
            >
              {activeTab === 'liquidity' && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50" />
              )}
              💧 Add Liquidity
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            {!isConnected ? (
              <div className="text-center py-16">
                <div className="text-4xl sm:text-6xl mb-4">🔌</div>
                <p className="text-black text-base sm:text-lg font-semibold mb-2">Connect Your Wallet</p>
                <p className="text-black text-sm">Connect to Sepolia testnet to continue</p>
              </div>
            ) : activeTab === 'swap' ? (
              <SwapInterface />
            ) : (
              <LiquidityInterface />
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-black/50 text-[10px] sm:text-xs">
          <p>Uniswap V2 • Sepolia Testnet</p>
          <p className="mt-1">Router: {ROUTER_ADDRESS.slice(0, 6)}...{ROUTER_ADDRESS.slice(-4)}</p>
        </div>
      </div>
    </div>
  );
}
