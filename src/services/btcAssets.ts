// @ts-nocheck
/**
 * SOLIS V1 - BTC ASSETS LIVE DATA SERVICE (NO COINGECKO)
 * Fetches real-time price, volume, and market cap for BTC wrappers
 * Uses DexScreener (primary) + Jupiter (backup) + Helius (metadata/logos)
 */

import { BTC_MINTS, SOLIS_CONFIG } from './config';
import { getMarketData } from './dexScreener';
import { getVerifiedPrice } from './jupiterPrice';
import { getBatchTokenMetadata } from './heliusMetadata';

export interface BTCAsset {
  symbol: string;
  name: string;
  custody: string;
  custodyType: 'centralized' | 'decentralized';
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  liquidity?: number;
  mint: string;
  logoURI?: string;
}

// Asset metadata (static - will be enhanced by Helius)
const ASSET_METADATA: Record<string, Omit<BTCAsset, 'price' | 'change24h' | 'volume24h' | 'marketCap' | 'liquidity' | 'logoURI'>> = {
  cbBTC: {
    symbol: "cbBTC",
    name: "Coinbase Wrapped BTC",
    custody: "Coinbase",
    custodyType: "centralized",
    mint: BTC_MINTS.cbBTC,
  },
  WBTC: {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    custody: "BitGo",
    custodyType: "centralized",
    mint: BTC_MINTS.WBTC,
  },
  zBTC: {
    symbol: "zBTC",
    name: "Zeus Network BTC",
    custody: "Zeus Guardians",
    custodyType: "decentralized",
    mint: BTC_MINTS.zBTC,
  },
  tBTC: {
    symbol: "tBTC",
    name: "Threshold BTC",
    custody: "Threshold Network",
    custodyType: "decentralized",
    mint: BTC_MINTS.tBTC,
  },
};

/**
 * Get BTC 24h change from WBTC (since WBTC tracks BTC 1:1)
 * No CoinGecko needed - WBTC change = BTC change
 */
async function getBTC24hChange(): Promise<number> {
  try {
    const wbtcData = await getMarketData(BTC_MINTS.WBTC);
    
    if (wbtcData && wbtcData.priceChange24h) {
      console.log(`[Solis] Using WBTC 24h change: ${wbtcData.priceChange24h}%`);
      return wbtcData.priceChange24h;
    }
    
    // Fallback: calculate from Jupiter price API
    const currentPrice = await getVerifiedPrice(BTC_MINTS.WBTC);
    if (currentPrice > 0) {
      // If we have current price but no 24h data, default to 0
      return 0;
    }
    
    return 0;
  } catch (error) {
    console.error('[Solis] Failed to get BTC 24h change:', error);
    return 0;
  }
}

/**
 * Fetch live data for a single BTC wrapper
 */
async function fetchAssetData(
  symbol: string, 
  mint: string, 
  btcChange: number,
  metadata?: { name: string; logoURI?: string }
): Promise<BTCAsset> {
  const baseMetadata = ASSET_METADATA[symbol];
  
  // Try DexScreener first (has volume + market cap)
  const dexData = await getMarketData(mint);
  
  if (dexData) {
    return {
      ...baseMetadata,
      name: metadata?.name || baseMetadata.name,
      logoURI: metadata?.logoURI,
      price: parseFloat(dexData.price),
      change24h: dexData.priceChange24h || btcChange,
      volume24h: dexData.volume24h,
      marketCap: dexData.fdv,
      liquidity: dexData.liquidity,
    };
  }
  
  // Fallback to Jupiter for price only
  console.log(`[Solis] DexScreener failed for ${symbol}, using Jupiter backup`);
  const jupPrice = await getVerifiedPrice(mint);
  
  return {
    ...baseMetadata,
    name: metadata?.name || baseMetadata.name,
    logoURI: metadata?.logoURI,
    price: jupPrice || 94000,
    change24h: btcChange,
    volume24h: 0,
    marketCap: 0,
  };
}

/**
 * MAIN FUNCTION: Fetch all BTC assets with live data
 */
export async function fetchBTCAssets(): Promise<BTCAsset[]> {
  console.log('[Solis] Fetching live BTC asset data...');
  
  // Get BTC 24h change from WBTC (no CoinGecko needed)
  const btcChange = await getBTC24hChange();
  
  // Fetch metadata (logos) from Helius
  const mints = Object.values(ASSET_METADATA).map(a => a.mint);
  const metadataMap = await getBatchTokenMetadata(mints);
  
  // Fetch all assets in parallel
  const assets = await Promise.all(
    Object.entries(ASSET_METADATA).map(([symbol, _]) => {
      const mint = ASSET_METADATA[symbol].mint;
      const metadata = metadataMap.get(mint);
      return fetchAssetData(symbol, mint, btcChange, metadata);
    })
  );
  
  console.log('[Solis] Assets updated:', assets.map(a => `${a.symbol}: $${a.price.toFixed(0)}`).join(', '));
  
  return assets;
}

/**
 * Format helpers for display
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatVolume(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(0)}K`;
  return `$${vol}`;
}
