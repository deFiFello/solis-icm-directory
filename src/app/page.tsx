"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import {
  getMarketData,
  getTokenMetadata,
  SOLIS_ASSETS,
  COMMON_MINTS,
} from "@/services";

// Waitlist Google Form URL
const WAITLIST_URL = "https://forms.gle/2LRiaZbVEc7zpmsC9";

// Typewriter messages acknowledging API partners
const TYPEWRITER_MESSAGES = [
  "Liquidity provided by Jupiter",
  "Metadata powered by Helius",
  "Shielded Swaps via PrivacyCash",
  "Trade stocks, crypto, gold - all on-chain.",
  "No brokers. No banks. No market hours.",
  "Your keys, your assets. Always.",
];

function TypeWriter({ messages }: { messages: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentMessage = messages[currentIndex];
    const timeout = isDeleting ? 30 : 80;

    if (!isDeleting && displayText === currentMessage) {
      // Pause at end of message
      const pauseTimeout = setTimeout(() => setIsDeleting(true), 2000);
      return () => clearTimeout(pauseTimeout);
    }

    if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setCurrentIndex((prev) => (prev + 1) % messages.length);
      return;
    }

    const timer = setTimeout(() => {
      if (isDeleting) {
        setDisplayText(currentMessage.slice(0, displayText.length - 1));
      } else {
        setDisplayText(currentMessage.slice(0, displayText.length + 1));
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentIndex, messages]);

  return (
    <span className="text-slate-400">
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

// Market Ticker with touch/swipe pause
function MarketTicker() {
  const [marketData, setMarketData] = useState([
    { symbol: "S&P", value: "5,234", change: "+0.8%", positive: true },
    { symbol: "NDQ", value: "16,432", change: "+1.2%", positive: true },
    { symbol: "GOLD", value: "$2,654", change: "-0.2%", positive: false },
    { symbol: "SOL", value: "$178.50", change: "+3.4%", positive: true },
    { symbol: "DOW", value: "42,156", change: "+0.5%", positive: true },
    { symbol: "OIL", value: "$78.32", change: "-1.1%", positive: false },
    { symbol: "10Y", value: "4.25%", change: "+0.02", positive: true },
  ]);

  const tickerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Touch/mouse handlers for manual scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tickerRef.current) return;
    setIsDragging(true);
    setIsPaused(true);
    setStartX(e.pageX - tickerRef.current.offsetLeft);
    setScrollLeft(tickerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tickerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tickerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    tickerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Resume after 3 seconds
    setTimeout(() => setIsPaused(false), 3000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!tickerRef.current) return;
    setIsPaused(true);
    setStartX(e.touches[0].pageX - tickerRef.current.offsetLeft);
    setScrollLeft(tickerRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!tickerRef.current) return;
    const x = e.touches[0].pageX - tickerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    tickerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    // Resume after 3 seconds
    setTimeout(() => setIsPaused(false), 3000);
  };

  return (
    <div className="border-b border-slate-800 bg-black overflow-hidden">
      <div
        ref={tickerRef}
        className={`flex gap-6 md:gap-8 py-3 px-4 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing ${
          !isPaused ? "animate-ticker" : ""
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Duplicate items for seamless loop */}
        {[...marketData, ...marketData].map((item, i) => (
          <div key={`${item.symbol}-${i}`} className="flex items-center gap-2 shrink-0">
            <span className="text-slate-500 text-xs tracking-wider">{item.symbol}</span>
            <span className="text-white font-medium text-sm">{item.value}</span>
            <span className={`text-xs ${item.positive ? "text-green-400" : "text-red-400"}`}>
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Collapsed metrics row
function CollapsedMetrics() {
  const [fearGreed, setFearGreed] = useState({ value: 25, label: "Extreme Fear" });
  const [btcDominance, setBtcDominance] = useState(57.6);
  const [stableDominance, setStableDominance] = useState(8.5);

  return (
    <div className="border-b border-slate-800 bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between py-2 md:py-3 gap-4 overflow-x-auto scrollbar-hide">
          {/* Fear & Greed */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-500 text-xs tracking-wider uppercase hidden sm:inline">Fear & Greed:</span>
            <span className="text-slate-500 text-xs tracking-wider uppercase sm:hidden">F&G:</span>
            <span className={`font-bold text-sm ${fearGreed.value <= 25 ? "text-red-400" : fearGreed.value >= 75 ? "text-green-400" : "text-yellow-400"}`}>
              {fearGreed.value}
            </span>
            <span className={`text-xs hidden md:inline ${fearGreed.value <= 25 ? "text-red-400" : fearGreed.value >= 75 ? "text-green-400" : "text-yellow-400"}`}>
              {fearGreed.label}
            </span>
          </div>

          <div className="w-px h-4 bg-slate-700 shrink-0" />

          {/* BTC Dominance */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-500 text-xs tracking-wider uppercase hidden sm:inline">BTC:</span>
            <span className="text-white font-bold text-sm">{btcDominance}%</span>
          </div>

          <div className="w-px h-4 bg-slate-700 shrink-0" />

          {/* Stablecoin Dominance */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-500 text-xs tracking-wider uppercase hidden sm:inline">Stables:</span>
            <span className="text-white font-bold text-sm">{stableDominance}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

type AssetCategory = "CRYPTO" | "STABLECOINS" | "STOCKS" | "METALS" | "COMMODITIES";

interface AssetData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  logoUri: string;
  mint: string;
}

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<AssetCategory>("CRYPTO");
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const categories: { key: AssetCategory; label: string; enabled: boolean }[] = [
    { key: "CRYPTO", label: "CRYPTO", enabled: true },
    { key: "STABLECOINS", label: "STABLECOINS", enabled: true },
    { key: "STOCKS", label: "STOCKS ✦", enabled: false },
    { key: "METALS", label: "METALS ✦", enabled: false },
    { key: "COMMODITIES", label: "COMMODITIES ✦", enabled: false },
  ];

  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      try {
        const categoryAssets = (SOLIS_ASSETS as any[]).filter((asset) => {
          if (activeCategory === "CRYPTO") {
            return !["USDC", "USDT", "PYUSD", "USD1", "PRIME", "CASH", "hyUSD"].includes(asset.symbol);
          }
          if (activeCategory === "STABLECOINS") {
            return ["USDC", "USDT", "PYUSD", "USD1", "PRIME", "CASH", "hyUSD"].includes(asset.symbol);
          }
          return false;
        });

        const assetData = await Promise.all(
          categoryAssets.map(async (asset) => {
            try {
              const [marketData, metadata] = await Promise.all([
                getMarketData(asset.mint),
                getTokenMetadata(asset.mint),
              ]);

              let price = parseFloat(marketData?.price || "0");
              // Sanity check for stablecoins
              if (["USDC", "USDT", "PYUSD", "USD1", "CASH", "hyUSD"].includes(asset.symbol)) {
                if (price < 0.8 || price > 1.2) price = 1.0;
              }

              return {
                symbol: asset.symbol,
                name: asset.name || asset.symbol,
                price,
                change24h: marketData?.priceChange24h || 0,
                volume24h: marketData?.volume24h || 0,
                marketCap: marketData?.marketCap || 0,
                logoUri: metadata?.logoURI || asset.logoURI || "",
                mint: asset.mint,
              };
            } catch (error) {
              return {
                symbol: asset.symbol,
                name: asset.name || asset.symbol,
                price: 0,
                change24h: 0,
                volume24h: 0,
                marketCap: 0,
                logoUri: asset.logoURI || "",
                mint: asset.mint,
              };
            }
          })
        );

        setAssets(assetData);
      } catch (error) {
        console.error("Failed to fetch assets:", error);
      } finally {
        setLoading(false);
      }
    };

    if (categories.find((c) => c.key === activeCategory)?.enabled) {
      fetchAssets();
    }
  }, [activeCategory]);

  const filteredAssets = assets.filter(
    (asset) =>
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(0)}K`;
    return vol > 0 ? `$${vol.toFixed(0)}` : "--";
  };

  const formatMarketCap = (cap: number) => {
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    if (cap >= 1e3) return `$${(cap / 1e3).toFixed(0)}K`;
    return cap > 0 ? `$${cap.toFixed(0)}` : "--";
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <Header />
      <MarketTicker />
      <CollapsedMetrics />

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-10 md:py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight">Solis</h1>
        <p className="text-slate-500 text-sm tracking-[0.3em] uppercase mb-4">24/7 CAPITAL MARKETS</p>
        
        {/* Typewriter with API acknowledgments */}
        <div className="h-8 mb-6">
          <TypeWriter messages={TYPEWRITER_MESSAGES} />
        </div>

        {/* Read More / Docs Link */}
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm tracking-wider transition-colors mb-8"
        >
          Learn how it works
          <span>→</span>
        </Link>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mb-8">
          <input
            type="text"
            placeholder="Search crypto, stocks, commodities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-slate-700 text-sm"
          />
        </div>

        {/* Category Tabs - Horizontal Scroll */}
        <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide pb-2 justify-start md:justify-center">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => cat.enabled && setActiveCategory(cat.key)}
              disabled={!cat.enabled}
              className={`px-4 py-2 text-sm tracking-wider rounded-lg shrink-0 whitespace-nowrap transition-colors ${
                activeCategory === cat.key
                  ? "bg-white text-black font-bold"
                  : cat.enabled
                  ? "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  : "bg-slate-900/50 text-slate-600 border border-slate-800/50 cursor-not-allowed"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Table */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="border border-slate-800 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_auto] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 px-4 md:px-5 py-3 bg-slate-900/50 border-b border-slate-800 text-xs text-slate-500 tracking-widest uppercase">
            <div>ASSET</div>
            <div className="text-right">PRICE</div>
            <div className="text-right">24H</div>
            <div className="text-right hidden md:block">VOLUME</div>
            <div className="text-right hidden md:block">MARKET CAP</div>
            <div></div>
          </div>

          {/* Table Body */}
          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading assets...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="py-12 text-center text-slate-500">No assets found</div>
          ) : (
            filteredAssets.map((asset) => (
              <Link
                key={asset.symbol}
                href={`/asset/${asset.symbol.toLowerCase()}`}
                className="grid grid-cols-[2fr_1fr_1fr_auto] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 px-4 md:px-5 py-4 items-center border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors"
              >
                {/* Asset */}
                <div className="flex items-center gap-3">
                  {asset.logoUri ? (
                    <img
                      src={asset.logoUri}
                      alt={asset.symbol}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800"
                    />
                  ) : (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">
                      {asset.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-white font-medium text-sm md:text-base truncate">{asset.symbol}</div>
                    <div className="text-slate-500 text-xs truncate">{asset.name}</div>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right text-white text-sm md:text-base">
                  {formatPrice(asset.price)}
                </div>

                {/* 24H Change */}
                <div
                  className={`text-right text-sm ${
                    asset.change24h >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {asset.change24h >= 0 ? "+" : ""}
                  {asset.change24h.toFixed(2)}%
                </div>

                {/* Volume - Hidden on mobile */}
                <div className="text-right text-slate-400 text-sm hidden md:block">
                  {formatVolume(asset.volume24h)}
                </div>

                {/* Market Cap - Hidden on mobile */}
                <div className="text-right text-slate-400 text-sm hidden md:block">
                  {formatMarketCap(asset.marketCap)}
                </div>

                {/* Swap Button */}
                <div className="text-right">
                  <span className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold tracking-wider rounded transition-colors">
                    SWAP
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Disabled Categories Message */}
        {!categories.find((c) => c.key === activeCategory)?.enabled && (
          <div className="py-16 text-center">
            <div className="text-slate-500 mb-4">
              Tokenized {activeCategory.toLowerCase()} coming Q2 2026
            </div>
            <a
              href={WAITLIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold tracking-wider rounded transition-colors"
            >
              JOIN WAITLIST
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-slate-600 text-sm">
            © 2026 Solis. Built on Solana.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-slate-500 hover:text-white text-sm transition-colors">
              Docs
            </Link>
            <a
              href="https://github.com/deFiFello/solis-icm-directory"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-white text-sm transition-colors"
            >
              GitHub
            </a>
            <a
              href={WAITLIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-white text-sm transition-colors"
            >
              Waitlist
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
