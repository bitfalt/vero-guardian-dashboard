'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getAddress, isConnected, requestAccess } from '@stellar/freighter-api';
import { getReputation } from '@/lib/stellar-interact';

interface WalletContextType {
  publicKey: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  reputation: number;
  isLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

function getFreighterErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
}

async function loadReputation(publicKey: string, alertOnFailure: boolean): Promise<number> {
  try {
    return await getReputation(publicKey);
  } catch (error) {
    const message = 'Wallet connected, but Stellar reputation could not be loaded. Refresh the page or try again later.';
    console.error('Failed to load Stellar reputation:', { publicKey, error });
    if (alertOnFailure) {
      alert(message);
    }
    return 0;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reputation, setReputation] = useState(0);

  useEffect(() => {
    async function checkConnection() {
      try {
        const connection = await isConnected();
        if (connection.error) {
          console.warn('Unable to restore Freighter connection: isConnected returned an error', connection.error);
          return;
        }
        if (!connection.isConnected) {
          return;
        }

        const address = await getAddress();
        if (address.error) {
          console.warn('Unable to restore Freighter connection: getAddress returned an error', address.error);
          return;
        }
        if (!address.address) {
          console.warn('Unable to restore Freighter connection: Freighter reported a connection without an address');
          return;
        }

        setPublicKey(address.address);
        setReputation(await loadReputation(address.address, false));
      } catch (error) {
        console.warn('Unable to restore Freighter connection:', error);
      } finally {
        setIsLoading(false);
      }
    }
    checkConnection();
  }, []);

  async function connect() {
    try {
      const access = await requestAccess();
      if (access.error) {
        throw new Error(
          getFreighterErrorMessage(access.error, 'Freighter could not grant wallet access. Open Freighter and try again.')
        );
      }
      if (!access.address) {
        throw new Error('Freighter did not return a wallet address. Unlock Freighter and try again.');
      }

      setPublicKey(access.address);
      setReputation(await loadReputation(access.address, true));
    } catch (error) {
      const message = getFreighterErrorMessage(
        error,
        'Freighter wallet connection failed. Install or unlock Freighter, then try again.'
      );
      console.error('Failed to connect wallet with Freighter:', error);
      alert(message);
    }
  }

  function disconnect() {
    setPublicKey(null);
    setReputation(0);
  }

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        isConnected: !!publicKey,
        connect,
        disconnect,
        reputation,
        isLoading,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
