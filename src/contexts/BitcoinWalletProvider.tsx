// @ts-nocheck
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface BitcoinWalletState {
  address: string | null;
  publicKey: string | null;
  connected: boolean;
}

interface BitcoinWalletContextType {
  wallet: BitcoinWalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const BitcoinWalletContext = createContext<BitcoinWalletContextType | null>(null);

export function BitcoinWalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<BitcoinWalletState>({
    address: null,
    publicKey: null,
    connected: false,
  });

  const connect = useCallback(async () => {
    // For now, we don't require a Bitcoin wallet connection
    // The user will send BTC manually from Shakepay to the generated Taproot address
    // In the future, we could integrate Xverse, Unisat, or other Bitcoin wallets
    console.log('Bitcoin wallet connection not required - manual send from Shakepay');
  }, []);

  const disconnect = useCallback(() => {
    setWallet({
      address: null,
      publicKey: null,
      connected: false,
    });
  }, []);

  return (
    <BitcoinWalletContext.Provider value={{ wallet, connect, disconnect }}>
      {children}
    </BitcoinWalletContext.Provider>
  );
}

export function useBitcoinWallet() {
  const context = useContext(BitcoinWalletContext);
  if (!context) {
    throw new Error('useBitcoinWallet must be used within a BitcoinWalletProvider');
  }
  return context;
}
