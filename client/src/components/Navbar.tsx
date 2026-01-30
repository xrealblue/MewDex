'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ConnectKitButton } from 'connectkit';

export default function Navbar() {

  return (
    <nav className="w-full relative bg-transparent flex justify-between items-center">
     

      <div className="flex pixel absolute top-4 right-4 items-center gap-4">
      
        <ConnectKitButton />
      </div>
    </nav>
  );
}