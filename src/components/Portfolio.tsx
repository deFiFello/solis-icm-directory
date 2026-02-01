'use client';

import { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { BTC_WRAPPERS, BTCWrapper } from '@/lib/tokens';

interface TokenBalance {
  wrapper: BTCWrapper;
  balance: number;
}

export function Portfolio() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [btcPrice, setBtcPrice] = useState<number>(0);

  useEffect(() => {
    if (!publicKey) {
      setBalances([]);
      return;
    }

    const fetchBalances = async () => {
      setLoading(true);
      const results: TokenBalance[] = [];

      for (const wrapper of BTC_WRAPPERS) {
        try {
          const mint = new PublicKey(wrapper.mint);
          const ata = await getAssociatedTokenAddress(mint, publicKey);
          const account = await getAccount(connection, ata);
          const balance = Number(account.amount) / Math.pow(10, wrapper.decimals);
          
          if (balance > 0) {
            results.push({ wrapper, balance });
          }
        } catch {
          // Token account doesn't exist or has no balance
        }
      }

      setBalances(results);
      setLoading(false);
    };

    fetchBalances();
    
    // Fetch BTC price (simplified - would use proper API in production)
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
      .then(res => res.json())
      .then(data => setBtcPrice(data.bitcoin?.usd || 0))
      .catch(() => setBtcPrice(100000)); // Fallback

  }, [publicKey, connection]);

  const totalBTC = balances.reduce((sum, b) => sum + b.balance, 0);
  const totalUSD = totalBTC * btcPrice;

  if (!publicKey) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      {/* Total BTC */}
      <div className="text-center mb-4">
        <span className="text-text-secondary text-sm">Your BTC</span>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-3xl font-bold text-accent-btc">
            {loading ? '...' : totalBTC.toFixed(8)}
          </span>
          <span className="text-text-muted">BTC</span>
        </div>
        {btcPrice > 0 && (
          <span className="text-text-muted text-sm">
            ${totalUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        )}
      </div>

      {/* Breakdown */}
      {balances.length > 0 && (
        <div className="space-y-2">
          {balances.map(({ wrapper, balance }) => (
            <div 
              key={wrapper.mint}
              className="flex items-center justify-between py-2 px-3 bg-bg-card rounded-input"
            >
              <div className="flex items-center gap-2">
                <span className="text-text-primary">{wrapper.symbol}</span>
                {wrapper.custodyModel === 'mpc' && (
                  <span className="badge-purple text-[10px]">MPC</span>
                )}
              </div>
              <span className="text-text-secondary">{balance.toFixed(8)}</span>
            </div>
          ))}
        </div>
      )}

      {/* No BTC State */}
      {!loading && balances.length === 0 && publicKey && (
        <div className="text-center py-4 text-text-muted text-sm">
          No wrapped BTC found.{' '}
          <button className="text-accent-btc hover:underline">
            Bridge BTC →
          </button>
        </div>
      )}
    </div>
  );
}
