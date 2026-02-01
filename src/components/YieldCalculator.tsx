'use client';

import { useState, useEffect } from 'react';

const APY_OPTIONS = [
  { label: '4% (Lending)', value: 0.04, risk: 'Low' },
  { label: '6% (Staking)', value: 0.06, risk: 'Low' },
  { label: '10% (LP Stable)', value: 0.10, risk: 'Medium' },
  { label: '15% (LP Volatile)', value: 0.15, risk: 'Higher' },
];

function formatBTC(value: number): string {
  return value.toFixed(6);
}

function formatUSD(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function AdoptionCurve({ currentPercent }: { currentPercent: number }) {
  // Current position on curve (we're at ~0.02%, map to visual position ~8%)
  const markerX = Math.max(5, Math.min(8 + currentPercent * 100, 95));

  return (
    <div className="relative h-20 w-full mt-2 mb-1">
      {/* Curve SVG */}
      <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
        {/* Gradient definition */}
        <defs>
          <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.5" />
            <stop offset="16%" stopColor="#22c55e" stopOpacity="0.2" />
            <stop offset="16%" stopColor="#475569" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#475569" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Filled area under curve */}
        <path
          d="M 0,40 C 5,38 10,30 20,20 C 30,10 40,5 50,5 C 60,5 70,10 80,20 C 90,30 95,38 100,40 Z"
          fill="url(#curveGradient)"
        />
        
        {/* Curve line */}
        <path
          d="M 0,40 C 5,38 10,30 20,20 C 30,10 40,5 50,5 C 60,5 70,10 80,20 C 90,30 95,38 100,40"
          fill="none"
          stroke="#64748b"
          strokeWidth="0.5"
        />
        
        {/* Vertical line at current position */}
        <line x1={markerX} y1="5" x2={markerX} y2="40" stroke="#22c55e" strokeWidth="0.5" strokeDasharray="2,2" />
        
        {/* "You are here" marker */}
        <circle cx={markerX} cy="35" r="2.5" fill="#22c55e" />
      </svg>
      
      {/* Labels below curve */}
      <div className="absolute -bottom-4 left-0 right-0 flex text-[8px] text-slate-600">
        <div className="w-[16%] text-center text-green-500">Early</div>
        <div className="w-[34%] text-center">Early Majority</div>
        <div className="w-[34%] text-center">Late Majority</div>
        <div className="w-[16%] text-center">Late</div>
      </div>
      
      {/* You are here label */}
      <div 
        className="absolute top-0 text-[9px] text-green-400 font-bold whitespace-nowrap"
        style={{ left: `${markerX}%`, transform: 'translateX(-50%)' }}
      >
        ↓ WE ARE HERE
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtext, highlight }: { 
  label: string; 
  value: string; 
  subtext: string; 
  highlight?: boolean;
}) {
  return (
    <div className={`p-2 rounded border ${highlight ? 'border-green-900/50 bg-green-950/20' : 'border-slate-800 bg-black/30'}`}>
      <div className="text-slate-500 text-[9px] tracking-widest uppercase">{label}</div>
      <div className={`font-bold ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</div>
      <div className="text-slate-600 text-[10px]">{subtext}</div>
    </div>
  );
}

export function YieldCalculator() {
  const [btcAmount, setBtcAmount] = useState(1);
  const [selectedApy, setSelectedApy] = useState(APY_OPTIONS[0]);
  const [btcPrice, setBtcPrice] = useState(93000);
  const [zbtcSupply, setZbtcSupply] = useState(308);
  const [showComparison, setShowComparison] = useState(false);

  // Fetch live data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // BTC Price
        const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const priceData = await priceRes.json();
        if (priceData.bitcoin?.usd) {
          setBtcPrice(priceData.bitcoin.usd);
        }
        
        // zBTC Supply (from Helius)
        const supplyRes = await fetch('https://mainnet.helius-rpc.com/?api-key=ee6c2238-42f8-4582-b9e5-3180f450b998', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenSupply',
            params: ['zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg'],
          }),
        });
        const supplyData = await supplyRes.json();
        if (supplyData.result?.value) {
          const { amount, decimals } = supplyData.result.value;
          setZbtcSupply(Number(amount) / Math.pow(10, decimals));
        }
      } catch (e) {
        console.error('Failed to fetch data:', e);
      }
    };
    fetchData();
  }, []);

  // Calculations
  const totalBTC = 19800000; // ~19.8M BTC in circulation
  const btcOnSolana = 4500; // Approximate total wrapped BTC on Solana
  const adoptionPercent = (zbtcSupply / totalBTC) * 100;
  
  const initialValueUSD = btcAmount * btcPrice;
  
  // HODL path (0% yield)
  const hodl1Y = btcAmount;
  const hodl5Y = btcAmount;
  
  // Yield path (compound annually)
  const yield1Y = btcAmount * (1 + selectedApy.value);
  const yield5Y = btcAmount * Math.pow(1 + selectedApy.value, 5);
  
  // Gains
  const gain5Y_BTC = yield5Y - hodl5Y;
  const gain5Y_USD = gain5Y_BTC * btcPrice;
  
  // Percentage gains
  const gain5Y_Percent = ((yield5Y - btcAmount) / btcAmount) * 100;

  return (
    <div className="space-y-3">
      {/* Early Adopter Section */}
      <div className="p-3 border border-green-900/30 rounded-lg bg-black/70 backdrop-blur-sm shadow-lg shadow-green-950/20">
        <div className="flex items-center justify-between mb-2">
          <div className="text-green-400 text-[10px] tracking-widest uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Early Adopter Window Open
          </div>
          <div className="text-green-400/70 text-[10px]">
            Only {adoptionPercent.toFixed(4)}% participating
          </div>
        </div>

        {/* Adoption Curve */}
        <AdoptionCurve currentPercent={adoptionPercent} />
        
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-2 mt-6">
          <MetricCard
            label="zBTC Minted"
            value={`${zbtcSupply.toFixed(0)} BTC`}
            subtext="Zeus Network"
            highlight
          />
          <MetricCard
            label="All Solana BTC"
            value={`${(btcOnSolana / 1000).toFixed(1)}K`}
            subtext="All wrappers"
          />
          <MetricCard
            label="Untapped"
            value="19.8M"
            subtext="Still on L1"
          />
        </div>

        <div className="mt-2 p-2 bg-black/30 rounded text-center">
          <span className="text-slate-400 text-xs">
            Early LPs earn <span className="text-green-400 font-medium">2-3x higher APY</span> before pools fill
          </span>
        </div>
      </div>

      {/* Calculator Section */}
      <div className="p-3 border border-slate-800 rounded-lg bg-black/70 backdrop-blur-sm shadow-lg shadow-black/50">
        <div className="text-slate-500 text-[10px] tracking-widest uppercase mb-2 text-center">
          Calculate Your Opportunity Cost
        </div>

        {/* Compact Input row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <div className="relative">
              <input
                type="number"
                value={btcAmount}
                onChange={(e) => setBtcAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-black border border-slate-700 rounded px-2 py-1.5 text-white font-bold focus:border-slate-500 focus:outline-none text-sm"
                step="0.1"
                min="0"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">BTC</span>
            </div>
          </div>
          <div>
            <select
              value={selectedApy.label}
              onChange={(e) => setSelectedApy(APY_OPTIONS.find(a => a.label === e.target.value) || APY_OPTIONS[0])}
              className="w-full bg-black border border-slate-700 rounded px-2 py-1.5 text-white focus:border-slate-500 focus:outline-none cursor-pointer text-sm"
            >
              {APY_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison Toggle */}
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="w-full text-[10px] text-slate-500 hover:text-slate-400 transition-colors mb-2"
        >
          {showComparison ? '▼ Hide' : '▶ Show'} HODL vs Yield breakdown
        </button>

        {/* Side by Side Comparison */}
        {showComparison && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* HODL Column */}
            <div className="p-2 border border-slate-800 rounded bg-black/50 opacity-60">
              <div className="text-slate-500 text-[9px] tracking-widest uppercase mb-1">HODL (0%)</div>
              <div className="text-slate-400 text-sm">5Y: {formatBTC(hodl5Y)} BTC</div>
              <div className="text-slate-600 text-xs">Gained: 0</div>
            </div>
            {/* Yield Column */}
            <div className="p-2 border border-green-900/50 rounded bg-green-950/20">
              <div className="text-green-400 text-[9px] tracking-widest uppercase mb-1">Yield ({(selectedApy.value * 100)}%)</div>
              <div className="text-white text-sm font-medium">5Y: {formatBTC(yield5Y)} BTC</div>
              <div className="text-green-400 text-xs">+{formatBTC(gain5Y_BTC)} BTC</div>
            </div>
          </div>
        )}

        {/* The Big Number */}
        <div className="p-3 border border-yellow-900/50 rounded bg-yellow-950/10 text-center">
          <div className="text-yellow-500/80 text-[9px] tracking-widest uppercase mb-1">
            5-Year Cost of Waiting
          </div>
          <div className="text-yellow-400 text-xl font-bold">
            -{formatBTC(gain5Y_BTC)} BTC
          </div>
          <div className="text-yellow-500/70 text-xs">
            ${formatUSD(gain5Y_USD)} you'll never get back
          </div>
          <div className="mt-1 text-slate-500 text-[10px]">
            <span className="text-yellow-400">{gain5Y_Percent.toFixed(0)}%</span> growth left on the table
          </div>
        </div>
      </div>
    </div>
  );
}
