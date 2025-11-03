'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import web3Provider from '@/lib/web3Provider';

export default function Navbar() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

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

  return (
    <nav className="w-full bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-purple-600">MewSwap</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-4">
        <Link href="/" className="text-gray-600 hover:text-purple-600">
          Swap
        </Link>
        <Link href="/pool" className="text-gray-600 hover:text-purple-600">
          Pool
        </Link>
        <button 
          onClick={connectWallet}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
        >
          {isConnected ? 
            `${address?.substring(0, 6)}...${address?.substring(address.length - 4)}` : 
            'Connect Wallet'}
        </button>
      </div>
    </nav>
  );
}