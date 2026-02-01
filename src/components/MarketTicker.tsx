"use client";

import { useState, useEffect } from "react";
import { getVerifiedPrice } from "@/services/jupiterPrice";
import { COMMON_MINTS, BTC_MINTS } from "@/services/config";

interface MarketData {
  btcPrice: number;
  btcChange: number;
  solPrice: number;
  solChange: number;
}

export default function MarketTicker() {
  const [marketData, setMarketData] = useState<MarketData>({
    btcPrice: 0,
    btcChange: 0,
    solPrice: 0,
    solChange: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  async function fetchMarketData() {
    try {
      // Use WBTC as BTC proxy (1:1 peg)
      const btcPrice = await getVerifiedPrice(BTC_MINTS.WBTC);
      const solPrice = await getVerifiedPrice(COMMON_MINTS.SOL);

      setMarketData({
        btcPrice: btcPrice || 0,
        btcChange: 0, // Jupiter doesn't provide 24h change
        solPrice: solPrice || 0,
        solChange: 0,
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch market data:", error);
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="border-b border-slate-800/50 bg-black">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center">
          <span className="text-slate-600 text-xs tracking-widest uppercase">
            Loading market data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-800/50 bg-black">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 text-xs tracking-widest uppercase">
              BTC
            </span>
            <span className="text-white text-sm font-bold tracking-wide">
              ${marketData.btcPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-600 text-xs tracking-widest uppercase">
              SOL
            </span>
            <span className="text-white text-sm font-bold tracking-wide">
              ${marketData.solPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="text-slate-700 text-xs tracking-widest uppercase">
          Live Prices
        </div>
      </div>
    </div>
  );
}
