'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getPythMarketData } from '@/services/pythPrices';
import { getAllMarketData } from '@/services/macroData';
import { getVerifiedPrice } from '@/services/jupiterPrice';
import { getMarketData as getDexData } from '@/services/dexScreener';
import { getTokenMetadata } from '@/services/heliusMetadata';
import { SOLIS_ASSETS } from '@/services/config';

// Simple sparkline component
function Sparkline({ data, positive }: { data: number[], positive: boolean }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = range > 0 ? 100 - ((value - min) / range) * 100 : 50;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width="60" height="24" viewBox="0 0 100 100" preserveAspectRatio="none" className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#4ade80' : '#f87171'}
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// Tooltip component
function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white text-black text-xs rounded shadow-lg w-64 z-50">
        <div className="text-left leading-relaxed">{content}</div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
          <div className="border-4 border-transparent border-t-white"></div>
        </div>
      </div>
    </div>
  );
}

// Generate realistic sparkline data
function generateSparkline(trend: 'up' | 'down' | 'flat') {
  const points = 12;
  const data = [];
  let value = 50;
  
  for (let i = 0; i < points; i++) {
    const volatility = (Math.random() - 0.5) * 6;
    
    if (trend === 'up') {
      value += 3 + volatility;
    } else if (trend === 'down') {
      value -= 3 + volatility;
    } else {
      value += volatility;
    }
    
    data.push(Math.max(0, Math.min(100, value)));
  }
  
  return data;
}

// Market data tooltips
const MARKET_TOOLTIPS: Record<string, string> = {
  'BTC': 'Bitcoin price in USD. The leading cryptocurrency and store of value.',
  'S&P': 'S&P 500 index tracking 500 largest US companies. Key stock market indicator.',
  'NDQ': 'NASDAQ-100 index of 100 largest non-financial companies. Tech-heavy benchmark.',
  'GOLD': 'Gold spot price per troy ounce. Traditional safe-haven and inflation hedge.',
  'SOL': 'Solana (SOL) price. High-performance blockchain for DeFi and NFTs.',
  'DOW': 'Dow Jones Industrial Average of 30 major US companies. Historic market indicator.',
  'OIL': 'WTI Crude Oil price per barrel. Key commodity and economic indicator.',
  '10Y': '10-Year US Treasury yield. Benchmark interest rate for government debt.',
};

export default function HomePage() {
  const [typewriterText, setTypewriterText] = useState('');
  const [messageIndex, setMessageIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [activeCategory, setActiveCategory] = useState('crypto');
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistCategory, setWaitlistCategory] = useState('');
  const [email, setEmail] = useState('');
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  
  // Live data state
  const [pythPrices, setPythPrices] = useState<any>(null);
  const [macroData, setMacroData] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const messages = [
    "Tokenized markets. Real assets. Your custody.",
    "Trade stocks, crypto, gold - all on-chain.",
    "24/7 access to global capital markets.",
    "No brokers. No banks. No market hours.",
    "Backed by real reserves. Verified on-chain."
  ];

  const categories = [
    { id: 'crypto', label: 'CRYPTO', available: true },
    { id: 'stablecoins', label: 'STABLECOINS', available: true },
    { id: 'stocks', label: 'STOCKS', available: false },
    { id: 'metals', label: 'METALS', available: false },
    { id: 'commodities', label: 'COMMODITIES', available: false },
  ];

  // Generate sparklines once on mount
  useEffect(() => {
    setSparklines({
      'BTC': generateSparkline('up'),
      'S&P': generateSparkline('up'),
      'NDQ': generateSparkline('up'),
      'GOLD': generateSparkline('down'),
      'SOL': generateSparkline('up'),
      'DOW': generateSparkline('up'),
      'OIL': generateSparkline('up'),
      '10Y': generateSparkline('flat'),
    });
  }, []);

  // Fetch live Pyth prices for ticker
  useEffect(() => {
    async function fetchPythPrices() {
      try {
        const prices = await getPythMarketData();
        setPythPrices(prices);
      } catch (error) {
        console.error('[Solis] Error fetching Pyth prices:', error);
      }
    }
    
    fetchPythPrices();
    const interval = setInterval(fetchPythPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch live macro data
  useEffect(() => {
    async function fetchMacro() {
      try {
        const data = await getAllMarketData();
        setMacroData(data);
      } catch (error) {
        console.error('[Solis] Error fetching macro data:', error);
      }
    }
    
    fetchMacro();
    const interval = setInterval(fetchMacro, 120000);
    return () => clearInterval(interval);
  }, []);

  // Fetch live asset data (prices, volume, liquidity, logos)
  useEffect(() => {
    async function fetchAssets() {
      try {
        setLoading(true);
        
        const assetsWithData = await Promise.all(
          SOLIS_ASSETS.map(async (asset: any) => {
            try {
              const dexData = await getDexData(asset.mint as string);
              const price = await getVerifiedPrice(asset.mint as string);
              
              // Get token supply from Helius for accurate market cap
              let supply = 0;
              try {
                const supplyResponse = await fetch(
                  'https://mainnet.helius-rpc.com/?api-key=ee6c2238-42f8-4582-b9e5-3180f450b998',
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      jsonrpc: '2.0',
                      id: 1,
                      method: 'getTokenSupply',
                      params: [asset.mint as string]
                    })
                  }
                );
                const supplyData = await supplyResponse.json();
                supply = supplyData.result?.value?.uiAmount || 0;
              } catch (err) {
                console.error(`[Solis] Error fetching supply for ${asset.symbol}:`, err);
              }
              
              const metadata = await getTokenMetadata(asset.mint as string);
              const actualPrice = price || (dexData ? parseFloat(dexData.price || "0") : 0);
              const marketCap = supply * actualPrice;
              
              return {
                symbol: asset.symbol,
                name: asset.name,
                mint: asset.mint,
                price: actualPrice,
                change: dexData?.priceChange24h || 0,
                volume: dexData?.volume24h || 0,
                mcap: marketCap,
                logoURI: metadata?.logoURI || asset.logoURI || '',
                category: asset.category
              };
            } catch (err) {
              console.error(`[Solis] Error fetching data for ${asset.symbol}:`, err);
              return {
                symbol: asset.symbol,
                name: asset.name,
                mint: asset.mint,
                price: 0,
                change: 0,
                volume: 0,
                mcap: 0,
                logoURI: '',
                category: asset.category
              };
            }
          })
        );
        
        setAssets(assetsWithData);
        setLoading(false);
      } catch (error) {
        console.error('[Solis] Error fetching assets:', error);
        setLoading(false);
      }
    }
    
    fetchAssets();
    const interval = setInterval(fetchAssets, 60000);
    return () => clearInterval(interval);
  }, []);

  // Market data for ticker - use live Pyth prices
  const marketData = pythPrices ? [
    { symbol: 'BTC', price: `$${Math.round(pythPrices.btc).toLocaleString()}`, change: '+2.3%', positive: true },
    { symbol: 'S&P', price: Math.round(pythPrices.sp500).toLocaleString(), change: '+0.8%', positive: true },
    { symbol: 'NDQ', price: Math.round(pythPrices.nasdaq).toLocaleString(), change: '+1.2%', positive: true },
    { symbol: 'GOLD', price: `$${Math.round(pythPrices.gold).toLocaleString()}`, change: '-0.2%', positive: false },
    { symbol: 'SOL', price: `$${pythPrices.sol.toFixed(2)}`, change: '+1.8%', positive: true },
    { symbol: 'DOW', price: Math.round(pythPrices.dow).toLocaleString(), change: '+0.5%', positive: true },
    { symbol: 'OIL', price: `$${pythPrices.oil.toFixed(2)}`, change: '+0.5%', positive: true },
    { symbol: '10Y', price: '4.12%', change: '', positive: true },
  ] : [
    { symbol: 'BTC', price: '$89,174', change: '+2.3%', positive: true },
    { symbol: 'S&P', price: '4,825', change: '+0.8%', positive: true },
    { symbol: 'NDQ', price: '15,234', change: '+1.2%', positive: true },
    { symbol: 'GOLD', price: '$2,043', change: '-0.2%', positive: false },
    { symbol: 'SOL', price: '$127', change: '+1.8%', positive: true },
    { symbol: 'DOW', price: '38,234', change: '+0.5%', positive: true },
    { symbol: 'OIL', price: '$73.45', change: '+0.5%', positive: true },
    { symbol: '10Y', price: '4.12%', change: '', positive: true },
  ];

  // Duplicate market data for seamless scrolling
  const tickerData = [...marketData, ...marketData, ...marketData];

  // Filter live assets by category
  const filteredAssets = assets.filter(asset => {
    if (activeCategory === 'crypto') {
      return asset.category === 'btc' || asset.symbol === 'SOL';
    } else if (activeCategory === 'stablecoins') {
      return asset.category === 'stable';
    }
    return false;
  });

  // Typewriter effect
  useEffect(() => {
    if (!isTyping) {
      const timeout = setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
        setTypewriterText('');
        setIsTyping(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }

    const currentMessage = messages[messageIndex];
    if (typewriterText.length < currentMessage.length) {
      const timeout = setTimeout(() => {
        setTypewriterText(currentMessage.slice(0, typewriterText.length + 1));
      }, 50);
      return () => clearTimeout(timeout);
    } else {
      setIsTyping(false);
    }
  }, [typewriterText, messageIndex, isTyping, messages]);

  function handleCategoryClick(categoryId: string, available: boolean) {
    if (available) {
      setActiveCategory(categoryId);
    } else {
      setWaitlistCategory(categoryId);
      setShowWaitlist(true);
    }
  }

  function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmail('');
    setShowWaitlist(false);
    alert(`Thank you! We'll notify you when ${waitlistCategory} launches.`);
  }

  function fmtPrice(price: number): string {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  }

  function fmtVolume(volume: number): string {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(1)}M`;
    return `$${(volume / 1e3).toFixed(1)}K`;
  }

  function fmtMarketCap(mcap: number): string {
    if (mcap >= 1e9) return `$${(mcap / 1e9).toFixed(1)}B`;
    if (mcap >= 1e6) return `$${(mcap / 1e6).toFixed(1)}M`;
    return `$${(mcap / 1e3).toFixed(1)}K`;
  }

  return (
    <main className="min-h-screen bg-black text-white font-mono">
      {/* Market Ticker + Indicators Header */}
      <div className="border-b border-slate-800 bg-black/95 backdrop-blur sticky top-0 z-50">
        <div className="w-full">
          
          {/* Scrolling Market Ticker */}
          <div className="border-b border-slate-900 overflow-hidden bg-black">
            <div className="flex animate-scroll">
              {tickerData.map((item, index) => (
                  <div key={`${item.symbol}-${index}`} className="flex items-center gap-4 px-6 py-3 whitespace-nowrap border-r border-slate-900">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                        {item.symbol}
                      </span>
                      <span className="text-sm font-bold text-white mb-0.5">
                        {item.price}
                      </span>
                      {item.change && (
                        <span className={`text-xs font-medium ${item.positive ? 'text-green-400' : 'text-red-400'}`}>
                          {item.change}
                        </span>
                      )}
                    </div>
                    {sparklines[item.symbol] && (
                      <div>
                        <Sparkline data={sparklines[item.symbol]} positive={item.positive} />
                      </div>
                    )}
                  </div>
              ))}
            </div>
          </div>

          {/* Simple Metric Cards */}
          <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="grid grid-cols-4 gap-6">
              
              {/* Fear & Greed */}
              <div className="bg-slate-950/50 border border-slate-900 rounded px-5 py-4">
                  <div className="text-[9px] text-slate-600 uppercase tracking-[0.15em] mb-2">
                    Fear & Greed Index
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-white">
                      {macroData ? macroData.fearGreed : '72'}
                    </span>
                    {macroData && (
                      <span className={`text-sm font-medium ${
                        macroData.fearGreed > 55 ? 'text-green-400' : 
                        macroData.fearGreed < 45 ? 'text-red-400' : 
                        'text-slate-400'
                      }`}>
                        {macroData.fearGreed > 75 ? 'Extreme Greed' :
                         macroData.fearGreed > 55 ? 'Greed' :
                         macroData.fearGreed > 45 ? 'Neutral' :
                         macroData.fearGreed > 25 ? 'Fear' : 'Extreme Fear'}
                      </span>
                    )}
                    {!macroData && <span className="text-sm text-green-400 font-medium">Greed</span>}
                  </div>
                </div>

              {/* BTC Dominance */}
              <div className="bg-slate-950/50 border border-slate-900 rounded px-5 py-4">
                  <div className="text-[9px] text-slate-600 uppercase tracking-[0.15em] mb-2">
                    Bitcoin Dominance
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-white">
                      {macroData ? `${macroData.btcDom.toFixed(1)}%` : '54.2%'}
                    </span>
                  </div>
                </div>

              {/* Stablecoin Dominance */}
              <div className="bg-slate-950/50 border border-slate-900 rounded px-5 py-4">
                  <div className="text-[9px] text-slate-600 uppercase tracking-[0.15em] mb-2">
                    Stablecoin Dominance
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-white">
                      {macroData ? `${macroData.stableDom.toFixed(1)}%` : '8.1%'}
                    </span>
                  </div>
                </div>

              {/* Live Indicator */}
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-[9px] text-slate-600 uppercase tracking-[0.2em]">LIVE PRICES</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Add CSS for scrolling animation */}
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold mb-3 tracking-tight">Solis</h1>
        </div>

        <div className="text-center mb-3">
          <h2 className="text-sm text-slate-500 uppercase tracking-[0.3em] font-bold">
            24/7 Capital Markets
          </h2>
        </div>

        <div className="text-center mb-16 h-7">
          <p className="text-base text-slate-400 tracking-wide">
            {typewriterText}
            <span className="inline-block w-[2px] h-5 bg-white ml-1 animate-pulse align-middle" />
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <input
            type="text"
            placeholder="Search crypto, stocks, commodities..."
            className="w-full bg-black border border-slate-800 rounded px-5 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-700 transition-colors"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center gap-3 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id, cat.available)}
              className={`px-5 py-2.5 text-xs font-bold tracking-[0.2em] uppercase transition-all ${
                activeCategory === cat.id && cat.available
                  ? 'bg-white text-black'
                  : cat.available
                  ? 'bg-transparent text-white border border-slate-800 hover:border-slate-700'
                  : 'bg-transparent text-slate-600 border border-slate-800 hover:text-slate-500 cursor-pointer'
              }`}
            >
              {cat.label}
              {!cat.available && ' (SOON)'}
            </button>
          ))}
        </div>

        {/* Asset Table */}
        <div className="border border-slate-800 rounded overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-950 border-b border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Asset</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-right">Price</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-right">24H</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-right">Volume</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-right">Market Cap</div>
            <div></div>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-slate-500">
              Loading live data...
            </div>
          ) : filteredAssets.length > 0 ? (
            filteredAssets.map((asset) => (
              <div
                key={asset.symbol}
                onClick={() => window.location.href = `/asset/${asset.symbol.toLowerCase()}`}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 border-b border-slate-900 hover:bg-slate-950 transition-colors items-center group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {asset.logoURI ? (
                    <Image 
                      src={asset.logoURI} 
                      alt={asset.symbol} 
                      width={36} 
                      height={36} 
                      className="rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  {!asset.logoURI && (
                    <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold group-hover:bg-slate-800 transition-colors">
                      {asset.symbol[0]}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm text-white">{asset.symbol}</div>
                    <div className="text-xs text-slate-600">{asset.name}</div>
                  </div>
                </div>

                <div className="text-right text-sm text-white font-medium">
                  {asset.price > 0 ? fmtPrice(asset.price) : '--'}
                </div>

                <div className={`text-right text-sm font-medium ${
                  asset.change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {asset.change !== 0 ? `${asset.change >= 0 ? '+' : ''}${asset.change.toFixed(1)}%` : '--'}
                </div>

                <div className="text-right text-sm text-slate-500">
                  {asset.volume > 0 ? fmtVolume(asset.volume) : '--'}
                </div>

                <div className="text-right text-sm text-slate-500">
                  {asset.mcap > 0 ? fmtMarketCap(asset.mcap) : '--'}
                </div>

                <Link 
                  href={`/swap?from=${asset.symbol}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-4 py-1.5 bg-white text-black text-[10px] font-bold tracking-[0.15em] uppercase hover:bg-slate-200 transition-colors"
                >
                  SWAP
                </Link>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-slate-500">
              No assets found
            </div>
          )}
        </div>
      </div>

      {/* Waitlist Modal */}
      {showWaitlist && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-black border border-slate-800 rounded p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-3 uppercase tracking-wider">
              {waitlistCategory} Coming Soon
            </h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Join the waitlist to be notified when {waitlistCategory} markets launch on Solis.
            </p>
            <form onSubmit={handleWaitlistSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full bg-black border border-slate-800 rounded px-4 py-3 text-sm text-white placeholder-slate-600 mb-4 focus:outline-none focus:border-slate-700"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-white text-black text-xs font-bold py-3 uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Join
                </button>
                <button
                  type="button"
                  onClick={() => setShowWaitlist(false)}
                  className="flex-1 bg-transparent border border-slate-800 text-white text-xs font-bold py-3 uppercase tracking-widest hover:border-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
