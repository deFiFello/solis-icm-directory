// @ts-nocheck
'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

// Zeus Network Program IDs (Mainnet)
export const ZEUS_PROGRAM_IDS = {
  twoWayPeg: 'ZPL2GoHJ42Cqdg2aTGxAGBPLdCxhpeWkpBnvPwrFQGz',
  bootstrapper: 'ZPLsAzVmV6gRipY8dzoWcGWJ81tkPUN9M7YfxJPru9w',
  bitcoinSPV: 'ZPLowzr41tCGkoRXuzEx4Ts98Jjrbfe9rtv7gqdgGkH',
};

// zBTC Token Mint (Mainnet)
export const ZBTC_MINT = 'zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg';

interface ZplClientContextType {
  programIds: typeof ZEUS_PROGRAM_IDS;
  zbtcMint: string;
  isReady: boolean;
}

const ZplClientContext = createContext<ZplClientContextType | null>(null);

export function ZplClientProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const value = useMemo(() => ({
    programIds: ZEUS_PROGRAM_IDS,
    zbtcMint: ZBTC_MINT,
    isReady: !!connection && !!publicKey,
  }), [connection, publicKey]);

  return (
    <ZplClientContext.Provider value={value}>
      {children}
    </ZplClientContext.Provider>
  );
}

export function useZplClient() {
  const context = useContext(ZplClientContext);
  if (!context) {
    throw new Error('useZplClient must be used within a ZplClientProvider');
  }
  return context;
}
