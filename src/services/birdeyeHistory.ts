// @ts-nocheck
/**
 * HISTORICAL DATA SERVICE (Jan 2026)
 * Uses DexScreener + mock data for charts
 * NO Birdeye dependency (401 errors)
 */

import { getMarketData } from './dexScreener';

export type TimeframeType = '1D' | '1W' | '1M' | '3M' | '1Y';

export interface ChartDataPoint {
  time: Date;
  price: number;
  volume?: number;
}

const TIMEFRAME_SECONDS: Record<TimeframeType, number> = {
  '1D': 86400,
  '1W': 604800,
  '1M': 2592000,
  '3M': 7776000,
  '1Y': 31536000,
};

/**
 * Generate realistic chart data (fallback since Birdeye requires paid API)
 */
export function generateFallbackChart(
  timeframe: TimeframeType,
  basePrice: number
): ChartDataPoint[] {
  const days = TIMEFRAME_SECONDS[timeframe] / 86400;
  const points = Math.min(days * 24, 168); // Max 168 points (1 week hourly)
  const now = Date.now();
  const interval = TIMEFRAME_SECONDS[timeframe] * 1000 / points;
  const volatility = basePrice * 0.05;
  
  let price = basePrice * (0.97 + Math.random() * 0.03);
  
  return Array.from({ length: points }, (_, i) => {
    price += (Math.random() - 0.48) * volatility * 0.1;
    price = Math.max(basePrice * 0.9, Math.min(basePrice * 1.1, price));
    
    return {
      time: new Date(now - (points - i) * interval),
      price,
    };
  });
}

/**
 * Main history function - returns mock data with current price
 */
export async function getBirdeyeHistory(
  mintAddress: string,
  timeframe: TimeframeType = '1W'
): Promise<ChartDataPoint[]> {
  console.log(`[Solis] Generating chart data for ${timeframe}...`);
  
  try {
    // Get current price from DexScreener
    const marketData = await getMarketData(mintAddress);
    const currentPrice = marketData ? parseFloat(marketData.price) : 89000;
    
    // Generate realistic chart
    return generateFallbackChart(timeframe, currentPrice);
  } catch (error) {
    console.error('[Solis] Chart generation failed:', error);
    return generateFallbackChart(timeframe, 89000);
  }
}

/**
 * Get 24h volume from DexScreener
 */
export async function getBirdeye24hVolume(mintAddress: string): Promise<number> {
  try {
    const marketData = await getMarketData(mintAddress);
    return marketData?.volume24h || 0;
  } catch (error) {
    console.error('[Solis] Volume fetch error:', error);
    return 0;
  }
}

/**
 * Volume consistency (simplified - no historical data needed)
 * Returns 0.5 (moderate consistency) as default
 */
export async function getVolumeConsistency(mintAddress: string): Promise<number> {
  // Return moderate consistency since we don't have historical data
  return 0.5;
}
