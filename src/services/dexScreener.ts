// @ts-nocheck
/**
 * DEXSCREENER API SERVICE (Verified Jan 2026)
 * Public API - No key required. 
 * Use this for: 24h Volume, Liquidity, and Social Links.
 */

interface DexPair {
    dexId?: string;
    url?: string;
    priceUsd?: string;
    baseToken?: { symbol: string };
    quoteToken?: { symbol: string };
    volume?: { h24: number };
    liquidity?: { usd: number };
    fdv?: number;
    priceChange?: { h24?: number };
    info?: {
      socials?: Array<{ type: string; url: string }>;
      websites?: Array<{ label: string; url: string }>;
    };
  }
  
  export async function getMarketData(mintAddress: string) {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`;
  
    try {
      const response = await fetch(url);
      const data = await response.json();
      const pairs: DexPair[] = data.pairs || [];
  
      if (pairs.length === 0) return null;
      
      // Sort by liquidity to ensure we get the primary trading pool
      const sortedPairs = pairs.sort((a, b) => 
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      );
      
      const topPair = sortedPairs[0];
      
      // Calculate totals across all pools (with null safety)
      const totalLiquidity = pairs.reduce((sum, p) => sum + (p.liquidity?.usd || 0), 0);
      const totalVolume = pairs.reduce((sum, p) => sum + (p.volume?.h24 || 0), 0);
  
      return {
        price: topPair.priceUsd,
        priceChange24h: topPair.priceChange?.h24 || 0,
        volume24h: topPair.volume?.h24 || 0,
        liquidity: topPair.liquidity?.usd || 0,
        totalLiquidity,
        totalVolume,
        fdv: topPair.fdv,
        socials: topPair.info?.socials || [],
        websites: topPair.info?.websites || [],
        chartUrl: topPair.url,
        allPairs: sortedPairs
          .filter(pair => pair.liquidity?.usd && pair.volume?.h24) // Only include pairs with valid data
          .map(pair => ({
            dex: pair.dexId || 'Unknown',
            baseToken: pair.baseToken?.symbol || 'Unknown',
            quoteToken: pair.quoteToken?.symbol || 'Unknown',
            liquidity: pair.liquidity?.usd || 0,
            volume24h: pair.volume?.h24 || 0,
            priceUsd: pair.priceUsd || '0',
            url: pair.url || ''
          }))
      };
    } catch (error) {
      console.error("DexScreener Catalog Error:", error);
      return null;
    }
  }