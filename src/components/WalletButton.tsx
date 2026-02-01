'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

export function WalletButton() {
  const { wallet, publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClick = () => {
    if (publicKey) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      className="flex items-center gap-2 bg-bg-hover border border-border rounded-button px-4 py-2
                 hover:border-text-muted transition-colors disabled:opacity-50"
    >
      {connecting ? (
        <span className="text-text-secondary">Connecting...</span>
      ) : publicKey ? (
        <>
          {wallet?.adapter.icon && (
            <img 
              src={wallet.adapter.icon} 
              alt={wallet.adapter.name}
              className="w-5 h-5"
            />
          )}
          <span className="text-text-primary">
            {formatAddress(publicKey.toBase58())}
          </span>
        </>
      ) : (
        <span className="text-text-primary">Connect Wallet</span>
      )}
    </button>
  );
}
