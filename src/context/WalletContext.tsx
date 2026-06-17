'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as freighterApi from '@stellar/freighter-api';

declare global {
  interface Window {
    freighter?: unknown;
  }
}

const STORAGE_KEY = 'vero_wallet_publicKey';
const FREIGHTER_EVENT = 'freighter-account-change';

interface FreighterResultError {
  message?: string;
}

interface WalletWatcher {
  watch: (callback: (params: { address?: string; error?: FreighterResultError }) => void) => {
    error?: FreighterResultError;
  };
  stop: () => void;
}

interface FreighterApiCompat {
  getPublicKey?: () => Promise<string>;
  isConnected?: () => Promise<{ isConnected: boolean; error?: FreighterResultError }>;
  getAddress?: () => Promise<{ address: string; error?: FreighterResultError }>;
  requestAccess?: () => Promise<{ address: string; error?: FreighterResultError }>;
  WatchWalletChanges?: new (timeout?: number) => WalletWatcher;
}

const freighterClient = freighterApi as FreighterApiCompat;

interface WalletContextType {
  publicKey: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  reputation: number;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

function getErrorMessage(error: unknown, fallback: string): string {
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

function isFreighterAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.freighter);
}

async function requestFreighterPublicKey(): Promise<string> {
  if (typeof freighterClient.requestAccess === 'function') {
    const access = await freighterClient.requestAccess();
    if (access.error) {
      throw new Error(
        getErrorMessage(access.error, 'Freighter could not grant wallet access. Open Freighter and try again.')
      );
    }

    if (!access.address) {
      throw new Error('Freighter did not return a wallet address. Unlock Freighter and try again.');
    }

    return access.address;
  }

  if (typeof freighterClient.getPublicKey === 'function') {
    const publicKey = await freighterClient.getPublicKey();
    if (!publicKey) {
      throw new Error('Freighter did not return a wallet public key');
    }
    return publicKey;
  }

  throw new Error('Freighter wallet API is unavailable');
}

async function readCurrentFreighterPublicKey(): Promise<string | null> {
  if (!isFreighterAvailable()) {
    return null;
  }

  if (
    typeof freighterClient.isConnected === 'function' &&
    typeof freighterClient.getAddress === 'function'
  ) {
    const connection = await freighterClient.isConnected();
    if (connection.error) {
      throw new Error(
        getErrorMessage(connection.error, 'Unable to verify Freighter wallet connection.')
      );
    }

    if (!connection.isConnected) {
      return null;
    }

    const address = await freighterClient.getAddress();
    if (address.error) {
      throw new Error(getErrorMessage(address.error, 'Unable to read Freighter wallet address.'));
    }

    return address.address || null;
  }

  if (typeof freighterClient.getPublicKey === 'function') {
    const publicKey = await freighterClient.getPublicKey();
    return publicKey || null;
  }

  return null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reputation, setReputation] = useState(0);

  const applyVerifiedPublicKey = useCallback((nextPublicKey: string) => {
    localStorage.setItem(STORAGE_KEY, nextPublicKey);
    setPublicKey(nextPublicKey);
    setReputation(0);
    setError(null);
  }, []);

  const clearWalletState = useCallback((nextError: string | null = null) => {
    localStorage.removeItem(STORAGE_KEY);
    setPublicKey(null);
    setReputation(0);
    setError(nextError);
  }, []);

  const refreshVerifiedWallet = useCallback(async (showLoading: boolean) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const currentPublicKey = await readCurrentFreighterPublicKey();
      if (currentPublicKey) {
        applyVerifiedPublicKey(currentPublicKey);
      } else {
        clearWalletState();
      }
    } catch (restoreError) {
      console.error('Failed to verify wallet connection:', restoreError);
      clearWalletState(getErrorMessage(restoreError, 'Failed to verify wallet connection'));
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [applyVerifiedPublicKey, clearWalletState]);

  useEffect(() => {
    let isMounted = true;

    const initializeWallet = async () => {
      setIsLoading(true);

      try {
        const storedPublicKey = localStorage.getItem(STORAGE_KEY);
        const currentPublicKey = await readCurrentFreighterPublicKey();
        if (!isMounted) {
          return;
        }

        if (!currentPublicKey) {
          clearWalletState();
          return;
        }

        if (!storedPublicKey || storedPublicKey === currentPublicKey) {
          applyVerifiedPublicKey(currentPublicKey);
          return;
        }

        clearWalletState();
      } catch (restoreError) {
        if (!isMounted) {
          return;
        }

        console.error('Failed to initialize wallet:', restoreError);
        clearWalletState(getErrorMessage(restoreError, 'Failed to initialize wallet'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initializeWallet();

    return () => {
      isMounted = false;
    };
  }, [applyVerifiedPublicKey, clearWalletState]);

  useEffect(() => {
    const handleAccountChange = () => {
      void refreshVerifiedWallet(false);
    };

    window.addEventListener(FREIGHTER_EVENT, handleAccountChange);

    const WatchWalletChanges = isFreighterAvailable()
      ? freighterClient.WatchWalletChanges
      : undefined;
    const watcher = typeof WatchWalletChanges === 'function' ? new WatchWalletChanges() : null;
    const watchResult = watcher?.watch(({ address, error: watchError }) => {
      if (watchError || !address) {
        clearWalletState(
          watchError ? getErrorMessage(watchError, 'Freighter wallet changed.') : null
        );
        return;
      }

      applyVerifiedPublicKey(address);
    });

    if (watchResult?.error) {
      console.warn('Unable to watch Freighter wallet changes:', watchResult.error);
    }

    return () => {
      window.removeEventListener(FREIGHTER_EVENT, handleAccountChange);
      watcher?.stop();
    };
  }, [applyVerifiedPublicKey, clearWalletState, refreshVerifiedWallet]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!isFreighterAvailable()) {
        throw new Error('Freighter wallet is not installed');
      }

      const nextPublicKey = await requestFreighterPublicKey();
      applyVerifiedPublicKey(nextPublicKey);
    } catch (connectError) {
      const message = getErrorMessage(connectError, 'Failed to connect wallet');
      console.error('Wallet connection error:', connectError);
      clearWalletState(message);
    } finally {
      setIsLoading(false);
    }
  }, [applyVerifiedPublicKey, clearWalletState]);

  const disconnect = useCallback(() => {
    clearWalletState();
  }, [clearWalletState]);

  const value = useMemo<WalletContextType>(
    () => ({
      publicKey,
      isConnected: publicKey !== null,
      isLoading,
      error,
      reputation,
      connect,
      disconnect,
    }),
    [connect, disconnect, error, isLoading, publicKey, reputation]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
