/**
 * BIRDEYE HISTORICAL DATA SERVICE (Verified Jan 2026)
 * Fetches historical OHLCV data for price charts
 * Free tier: 100 requests/day, no API key required
 */

export type TimeframeType = '1D' | '1W' | '1M' | '3M' | '1Y';

interface BirdeyeOHLCV {
  unixTime: number;
  value: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

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

const BIRDEYE_INTERVAL: Record<TimeframeType, string> = {
  '1D': '15m',
  '1W': '1H',
  '1M': '4H',
  '3M': '1D',
  '1Y': '1D',
};

/**
 * Fetch historical OHLCV data from Birdeye
 */
export async function getBirdeyeHistory(
  mintAddress: string,
  timeframe: TimeframeType = '1W'
): Promise<ChartDataPoint[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const timeAgo = now - TIMEFRAME_SECONDS[timeframe];
    
    const url = `https://public-api.birdeye.so/defi/ohlcv?address=${mintAddress}&type=${BIRDEYE_INTERVAL[timeframe]}&time_from=${timeAgo}&time_to=${now}`;
    
    console.log(`[Solis] Fetching Birdeye data for ${mintAddress} (${timeframe})...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Birdeye API failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.data?.items) {
      console.log(`[Solis] No Birdeye data available for ${mintAddress}`);
      return [];
    }

    const items: BirdeyeOHLCV[] = data.data.items;
    
    // Convert to chart format
    const chartData: ChartDataPoint[] = items.map(item => ({
      time: new Date(item.unixTime * 1000),
      price: item.close,
      volume: item.volume,
    }));

    console.log(`[Solis] Fetched ${chartData.length} data points from Birdeye`);
    
    return chartData;
  } catch (error) {
    console.error('[Solis] Birdeye history fetch failed:', error);
    return [];
  }
}

/**
 * Get volume consistency metric for Solis Score
 * Returns standard deviation of volume (lower = more consistent)
 */
export async function getVolumeConsistency(
  mintAddress: string
): Promise<number> {
  try {
    const history = await getBirdeyeHistory(mintAddress, '1M');
    
    if (history.length < 7) {
      return 0; // Not enough data
    }

    const volumes = history
      .filter(h => h.volume && h.volume > 0)
      .map(h => h.volume!);
    
    if (volumes.length === 0) return 0;

    // Calculate standard deviation
    const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const variance = volumes.reduce((sum, vol) => sum + Math.pow(vol - mean, 2), 0) / volumes.length;
    const stdDev = Math.sqrt(variance);
    
    // Return coefficient of variation (stdDev / mean)
    // Lower is better (more consistent)
    return stdDev / mean;
  } catch (error) {
    console.error('[Solis] Volume consistency calculation failed:', error);
    return 1; // Assume high variance if error
  }
}

/**
 * Get 24h volume from Birdeye
 */
export async function getBirdeye24hVolume(mintAddress: string): Promise<number> {
  try {
    const url = `https://public-api.birdeye.so/defi/token_overview?address=${mintAddress}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.data?.v24hUSD || 0;
  } catch (error) {
    console.error('[Solis] Birdeye 24h volume error:', error);
    return 0;
  }
}

/**
 * Generate fallback mock data if Birdeye fails
 */
export function generateFallbackChart(
  timeframe: TimeframeType,
  basePrice: number
): ChartDataPoint[] {
  const days = TIMEFRAME_SECONDS[timeframe] / 86400;
  const points = Math.min(days * 24, 60);
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
