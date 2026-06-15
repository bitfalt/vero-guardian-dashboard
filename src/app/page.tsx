'use client';

import { useWallet } from '@/context/WalletContext';
import ConnectButton from '@/components/ConnectButton';
import PRFeed from '@/components/PRFeed';
import TaskCard from '@/components/TaskCard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Shield, Trophy, Activity, ArrowRight, Code2, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const { isConnected, reputation } = useWallet();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Vero Guardian</h1>
                <p className="text-xs text-slate-400">Decentralized Validation Network</p>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome / Stats */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Welcome back, Guardian!
                </h2>
                <p className="text-slate-400 max-w-xl">
                  Review and validate pull requests to maintain network security and earn rewards.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="bg-slate-800/80 rounded-xl px-4 py-3 border border-slate-700">
                  <div className="flex items-center gap-2 text-amber-400 mb-1">
                    <Trophy className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Reputation</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{isConnected ? reputation : '---'}</p>
                </div>
                <div className="bg-slate-800/80 rounded-xl px-4 py-3 border border-slate-700">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Validations</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{isConnected ? 12 : '---'}</p>
                </div>
                <div className="bg-slate-800/80 rounded-xl px-4 py-3 border border-slate-700">
                  <div className="flex items-center gap-2 text-indigo-400 mb-1">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Active</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{isConnected ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - PR Feed */}
          <div className="lg:col-span-2">
            <ErrorBoundary>
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <PRFeed />
              </div>
            </ErrorBoundary>
          </div>

          {/* Right Column - Tasks & Quick Actions */}
          <div className="space-y-6">
            {/* Tasks */}
            <ErrorBoundary>
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <TaskCard />
              </div>
            </ErrorBoundary>

            {/* Quick Actions */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-violet-400" />
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-colors group">
                  <span className="font-medium">View Network Status</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                </button>
                <button className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-colors group">
                  <span className="font-medium">Stake VERO Tokens</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                </button>
                <button className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-colors group">
                  <span className="font-medium">Rewards History</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-slate-500 text-center md:text-left">© 2026 Vero Guardian. All rights reserved.</p>
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
              <a href="#" className="flex items-center text-sm text-slate-400 hover:text-slate-200 transition-colors min-h-[44px] px-2">Documentation</a>
              <a href="#" className="flex items-center text-sm text-slate-400 hover:text-slate-200 transition-colors min-h-[44px] px-2">Discord</a>
              <a href="#" className="flex items-center text-sm text-slate-400 hover:text-slate-200 transition-colors min-h-[44px] px-2">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
