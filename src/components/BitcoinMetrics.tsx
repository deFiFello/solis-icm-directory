'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Metrics {
  btcPrice: number;
  btcChange24h: number;
  btcMarketCap: number;
  zbtcSupply: number;
  btcOnSolana: number;
  sparkline: number[];
  loading: boolean;
  error: string | null;
}

// Keeping your established mint addresses
const TOKEN_MINTS = {
  zBTC: 'zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg',
  WBTC: '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
  tBTC: '6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU',
  cbBTC: 'cbBTCcLq2jYWQXg3uy1bqMR5kyuEJ6e7LSwTSoJFYmm',
};

// Using your Helius RPC for all V1 data
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=ee6c2238-42f8-4582-b9e5-3180f450b998';

export function BitcoinMetrics() {
  const [metrics, setMetrics] = useState<Metrics>({
    btcPrice: 0,
    btcChange24h: 0,
    btcMarketCap: 0,
    zbtcSupply: 0,
    btcOnSolana: 0,
    sparkline: [],
    loading: true,
    error: null,
  });
  const [wsConnected, setWsConnected] = useState(false);

  // 1. Fetch live supply via Helius
  const fetchOnChainData = useCallback(async () => {
    try {
      const mints = Object.values(TOKEN_MINTS);
      
      // Batch request for all BTC supplies
      const supplyPromises = mints.map(async (mint) => {
        const res = await fetch(HELIUS_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenSupply',
            params: [mint],
          }),
        });
        const data = await res.json();
        return {
          mint,
          supply: Number(data.result?.value?.amount || 0) / Math.pow(10, data.result?.value?.decimals || 8)
        };
      });

      const supplies = await Promise.all(supplyPromises);
      const totalBtcOnSolana = supplies.reduce((acc, curr) => acc + curr.supply, 0);
      const zBtcSupply = supplies.find(s => s.mint === TOKEN_MINTS.zBTC)?.supply || 0;

      // 2. Fetch live price via Jupiter Price API
      const priceRes = await fetch(`https://api.jup.ag/price/v2?ids=bitcoin`);
      const priceData = await priceRes.json();
      const btcPrice = parseFloat(priceData.data?.bitcoin?.price || '0');

      setMetrics(prev => ({
        ...prev,
        btcPrice,
        zbtcSupply: zBtcSupply,
        btcOnSolana: totalBtcOnSolana,
        btcMarketCap: btcPrice * 19700000, // Approx global supply
        loading: false,
      }));
      setWsConnected(true);
    } catch (err) {
      console.error('Metrics fetch error:', err);
      setMetrics(prev => ({ ...prev, loading: false, error: 'Feed delayed' }));
    }
  }, []);

  useEffect(() => {
    fetchOnChainData();
    const interval = setInterval(fetchOnChainData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchOnChainData]);

  // Keeping your exact formatting logic for V1 branding
  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    return value.toLocaleString();
  };

  const formatBTC = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 relative z-20">
      {/* BTC Price Card - Exactly as designed */}
      <div className="p-3 border border-slate-800 rounded card-interactive card-gradient">
        <div className="flex justify-between items-start mb-1">
          <div className="text-slate-500 text-xs tracking-widest uppercase">Bitcoin Price</div>
          <div className="text-green-500 text-[10px] font-mono">+Live</div>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold tracking-tighter">
            ${metrics.loading ? '...' : metrics.btcPrice.toLocaleString()}
          </div>
        </div>
      </div>

      {/* zBTC Supply Card */}
      <div className="p-3 border border-slate-800 rounded card-interactive card-gradient">
        <div className="text-slate-500 text-xs tracking-widest uppercase mb-1">zBTC Circulating</div>
        <div className="flex items-center justify-between">
          <div className="text-white font-bold">{metrics.loading ? '...' : formatBTC(metrics.zbtcSupply)}</div>
          <div className="text-[10px] text-slate-600 font-mono">ZEUS NETWORK</div>
        </div>
      </div>

      {/* BTC on Solana Card */}
      <div className="p-3 border border-slate-800 rounded card-interactive card-gradient">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-slate-500 text-xs tracking-widest uppercase">BTC on Solana</div>
            <div className="text-white font-bold">{metrics.loading ? '...' : formatBTC(metrics.btcOnSolana)}</div>
          </div>
          <div className="text-slate-600 text-xs">All wrappers</div>
        </div>
      </div>

      <div className="md:col-span-3 flex items-center justify-between text-[10px] text-slate-600 mt-1">
        <span className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          {wsConnected ? 'Helius Live Feed' : 'Connecting to RPC...'}
        </span>
        <span>Verified via Jupiter Price API</span>
      </div>
    </div>
  );
}