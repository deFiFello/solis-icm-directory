// @ts-nocheck
/**
 * MACRO DATA SERVICE
 * External APIs for Fear & Greed, BTC Dominance, Treasury Yields
 */

// CoinGecko API (free tier)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Alternative.me Fear & Greed Index
const FEAR_GREED_API = 'https://api.alternative.me/fng/';

// Treasury Yield (using Alpha Vantage or similar)
const TREASURY_API = 'https://www.alphavantage.co/query';

export interface MacroData {
  fearGreed: number;
  btcDominance: number;
  stableDominance: number;
  treasury10y: number;
}

/**
 * Get Fear & Greed Index
 */
async function getFearGreedIndex(): Promise<number> {
  try {
    const response = await fetch(`${FEAR_GREED_API}?limit=1`);
    const data = await response.json();
    
    if (data.data && data.data[0]) {
      return parseInt(data.data[0].value);
    }
    
    return 0;
  } catch (error) {
    console.error('[Solis] Fear & Greed API error:', error);
    return 0;
  }
}

/**
 * Get BTC Dominance from CoinGecko
 */
async function getBtcDominance(): Promise<number> {
  try {
    const response = await fetch(`${COINGECKO_API}/global`);
    const data = await response.json();
    
    if (data.data && data.data.market_cap_percentage) {
      return data.data.market_cap_percentage.btc || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('[Solis] CoinGecko API error:', error);
    return 0;
  }
}

/**
 * Get Stablecoin Dominance
 */
async function getStableDominance(): Promise<number> {
  try {
    const response = await fetch(`${COINGECKO_API}/global`);
    const data = await response.json();
    
    if (data.data && data.data.market_cap_percentage) {
      const stablecoins = ['usdt', 'usdc', 'dai', 'busd', 'tusd'];
      const stableShare = stablecoins.reduce((sum, coin) => {
        return sum + (data.data.market_cap_percentage[coin] || 0);
      }, 0);
      
      return stableShare;
    }
    
    return 0;
  } catch (error) {
    console.error('[Solis] Stablecoin dominance error:', error);
    return 0;
  }
}

/**
 * Get 10-Year Treasury Yield
 * Note: May need API key for production
 */
async function getTreasury10Y(): Promise<number> {
  try {
    // Using a free endpoint that doesn't require API key
    // In production, use Alpha Vantage or Federal Reserve API
    const response = await fetch('https://financialmodelingprep.com/api/v4/treasury?from=2026-01-01&to=2026-01-23');
    const data = await response.json();
    
    if (data && data.length > 0) {
      // Get most recent 10-year yield
      const latest = data[data.length - 1];
      return latest.year10 || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('[Solis] Treasury yield error:', error);
    return 4.12; // Fallback to reasonable default
  }
}

/**
 * Get all macro data
 */
export async function getMacroData(): Promise<MacroData> {
  const [fearGreed, btcDominance, stableDominance, treasury10y] = await Promise.all([
    getFearGreedIndex(),
    getBtcDominance(),
    getStableDominance(),
    getTreasury10Y(),
  ]);

  return {
    fearGreed,
    btcDominance,
    stableDominance,
    treasury10y,
  };
}

/**
 * Fetch all market data (combined)
 */
export async function getAllMarketData() {
  const macro = await getMacroData();
  
  return {
    fearGreed: macro.fearGreed,
    btcDom: macro.btcDominance,
    stableDom: macro.stableDominance,
    treasury: macro.treasury10y,
  };
}
