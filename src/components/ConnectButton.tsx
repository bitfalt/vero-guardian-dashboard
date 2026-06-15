'use client';

import { useWallet } from '@/context/WalletContext';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

export default function ConnectButton() {
  const { publicKey, isConnected, connect, disconnect, isLoading } = useWallet();

  function truncateAddress(address: string) {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  if (isLoading) {
    return (
      <button disabled className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-400 rounded-lg border border-slate-700 cursor-not-allowed">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading...</span>
      </button>
    );
  }

  if (isConnected && publicKey) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-900/30 text-emerald-400 rounded-lg border border-emerald-800 min-h-[44px]">
          <Wallet className="w-4 h-4" />
          <span className="text-sm font-mono">{truncateAddress(publicKey)}</span>
        </div>
        <button
          onClick={disconnect}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors min-h-[44px] min-w-[44px]"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-900/20 min-h-[44px]"
    >
      <Wallet className="w-4 h-4" />
      <span>Connect Wallet</span>
    </button>
  );
}
