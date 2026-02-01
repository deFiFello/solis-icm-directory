'use client';

import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

// Helius RPC for better performance (free tier)
const HELIUS_RPC = process.env.NEXT_PUBLIC_HELIUS_RPC || clusterApiUrl('mainnet-beta');

export const SolanaProvider: FC<Props> = ({ children }) => {
  const endpoint = useMemo(() => HELIUS_RPC, []);
  
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
