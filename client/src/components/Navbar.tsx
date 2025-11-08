'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ConnectKitButton } from 'connectkit';

export default function Navbar() {
  const { address, isConnected } = useAccount();

  return (
    <nav className="w-full bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-purple-600">🐱 MewSwap 🐈</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/" className="text-gray-600 hover:text-purple-600">
          Swap
        </Link>
        <Link href="/pool" className="text-gray-600 hover:text-purple-600">
          Pool
        </Link>
        <ConnectKitButton />
      </div>
    </nav>
  );
}