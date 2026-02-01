/**
 * SOLIS SCORE ALGORITHM (Full Implementation)
 * 
 * Based on Whitepaper Section 4: Solis Score Methodology
 * Calculates 0-100 score from multiple data sources
 * 
 * Score Components:
 * - Custody Security (25%)
 * - Liquidity Depth (25%)
 * - Holder Distribution (15%)
 * - Trading Activity (15%)
 * - Peg Stability (10%)
 * - Redemption Speed (10%)
 */

import { getMarketData } from '@/services/dexScreener';
import { getHolderConcentration, calculateHolderScore } from './heliusHolders';
import { getVolumeConsistency, getBirdeye24hVolume } from './birdeyeHistory';
import { getVerifiedPrice } from '@/services/jupiterPrice';
import { BTC_MINTS } from '@/services/config';

export interface SolisScoreResult {
  totalScore: number;
  grade: string;
  label: string;
  breakdown: {
    custodySecurity: number;
    liquidityDepth: number;
    holderDistribution: number;
    tradingActivity: number;
    pegStability: number;
    redemptionSpeed: number;
  };
}

type CustodyType = 'centralized' | 'decentralized';

interface AssetMetadata {
  symbol: string;
  mint: string;
  custodyType: CustodyType;
  custodian: string;
  redemptionHours: number; // Hours for redemption
}

/**
 * Static asset metadata for scoring
 */
const ASSET_METADATA: Record<string, AssetMetadata> = {
  cbBTC: {
    symbol: 'cbBTC',
    mint: BTC_MINTS.cbBTC,
    custodyType: 'centralized',
    custodian: 'Coinbase',
    redemptionHours: 0.5, // ~30 minutes
  },
  WBTC: {
    symbol: 'WBTC',
    mint: BTC_MINTS.WBTC,
    custodyType: 'centralized',
    custodian: 'BitGo',
    redemptionHours: 2,
  },
  zBTC: {
    symbol: 'zBTC',
    mint: BTC_MINTS.zBTC,
    custodyType: 'decentralized',
    custodian: 'Zeus Guardians',
    redemptionHours: 6,
  },
  tBTC: {
    symbol: 'tBTC',
    mint: BTC_MINTS.tBTC,
    custodyType: 'decentralized',
    custodian: 'Threshold Network',
    redemptionHours: 12,
  },
};

/**
 * 1. CUSTODY SECURITY SCORE (25 points)
 */
function calculateCustodyScore(metadata: AssetMetadata): number {
  if (metadata.custodyType === 'decentralized') {
    return 25; // Full points for decentralized
  }

  // Centralized - bonus for trusted custodians
  const trustedCustodians = ['Coinbase', 'BitGo', 'Kraken'];
  if (trustedCustodians.includes(metadata.custodian)) {
    return 20; // 80% of max for institutional custody
  }

  return 15; // 60% of max for other centralized
}

/**
 * 2. LIQUIDITY DEPTH SCORE (25 points)
 */
async function calculateLiquidityScore(mint: string): Promise<number> {
  try {
    const marketData = await getMarketData(mint);
    const liquidity = marketData?.liquidity || 0;

    // Scoring thresholds
    if (liquidity >= 10_000_000) return 25;  // $10M+
    if (liquidity >= 5_000_000) return 22;   // $5M-10M
    if (liquidity >= 2_000_000) return 19;   // $2M-5M
    if (liquidity >= 1_000_000) return 16;   // $1M-2M
    if (liquidity >= 500_000) return 12;     // $500K-1M
    if (liquidity >= 250_000) return 8;      // $250K-500K
    if (liquidity >= 100_000) return 5;      // $100K-250K
    return 2;                                 // <$100K

  } catch (error) {
    console.error('[Solis Score] Liquidity score failed:', error);
    return 0;
  }
}

/**
 * 3. HOLDER DISTRIBUTION SCORE (15 points)
 */
async function calculateDistributionScore(mint: string): Promise<number> {
  try {
    const concentration = await getHolderConcentration(mint);
    return calculateHolderScore(concentration);
  } catch (error) {
    console.error('[Solis Score] Distribution score failed:', error);
    return 0;
  }
}

/**
 * 4. TRADING ACTIVITY SCORE (15 points)
 */
async function calculateTradingScore(mint: string): Promise<number> {
  try {
    // Get volume and consistency from Birdeye
    const volume24h = await getBirdeye24hVolume(mint);
    const consistency = await getVolumeConsistency(mint);

    // Volume component (10 points)
    let volumeScore = 0;
    if (volume24h >= 1_000_000) volumeScore = 10;
    else if (volume24h >= 500_000) volumeScore = 8;
    else if (volume24h >= 250_000) volumeScore = 6;
    else if (volume24h >= 100_000) volumeScore = 4;
    else if (volume24h >= 50_000) volumeScore = 2;

    // Consistency component (5 points)
    // Lower coefficient of variation = better
    let consistencyScore = 0;
    if (consistency < 0.3) consistencyScore = 5;        // Very consistent
    else if (consistency < 0.5) consistencyScore = 4;   // Good
    else if (consistency < 0.8) consistencyScore = 3;   // Moderate
    else if (consistency < 1.2) consistencyScore = 2;   // Variable
    else if (consistency < 2.0) consistencyScore = 1;   // Very variable

    return volumeScore + consistencyScore;
  } catch (error) {
    console.error('[Solis Score] Trading score failed:', error);
    return 0;
  }
}

/**
 * 5. PEG STABILITY SCORE (10 points)
 */
async function calculatePegScore(mint: string): Promise<number> {
  try {
    // Compare price to WBTC (stable reference)
    const [price, wbtcPrice] = await Promise.all([
      getVerifiedPrice(mint),
      getVerifiedPrice(BTC_MINTS.WBTC),
    ]);

    if (!price || !wbtcPrice) return 0;

    const deviation = Math.abs((price - wbtcPrice) / wbtcPrice) * 100;

    // Scoring thresholds (% deviation)
    if (deviation < 0.25) return 10;  // <0.25% perfect peg
    if (deviation < 0.5) return 9;    // <0.5% excellent
    if (deviation < 1.0) return 7;    // <1% good
    if (deviation < 2.0) return 5;    // <2% acceptable
    if (deviation < 3.0) return 3;    // <3% concerning
    return 1;                          // >3% poor peg

  } catch (error) {
    console.error('[Solis Score] Peg score failed:', error);
    return 5; // Default middle score
  }
}

/**
 * 6. REDEMPTION SPEED SCORE (10 points)
 */
function calculateRedemptionScore(metadata: AssetMetadata): number {
  const hours = metadata.redemptionHours;

  if (hours <= 1) return 10;         // Instant (<1 hour)
  if (hours <= 6) return 8;          // Very fast (1-6 hours)
  if (hours <= 24) return 6;         // Fast (6-24 hours)
  if (hours <= 72) return 4;         // Moderate (1-3 days)
  return 2;                          // Slow (>3 days)
}

/**
 * Convert total score to letter grade
 */
function getGrade(score: number): { grade: string; label: string } {
  if (score >= 95) return { grade: 'A+', label: 'Excellent' };
  if (score >= 90) return { grade: 'A', label: 'Excellent' };
  if (score >= 85) return { grade: 'A-', label: 'Excellent' };
  if (score >= 80) return { grade: 'B+', label: 'Good' };
  if (score >= 75) return { grade: 'B', label: 'Good' };
  if (score >= 70) return { grade: 'B-', label: 'Fair' };
  if (score >= 65) return { grade: 'C+', label: 'Fair' };
  if (score >= 60) return { grade: 'C', label: 'Adequate' };
  return { grade: 'C-', label: 'Caution' };
}

/**
 * MAIN FUNCTION: Calculate complete Solis Score
 */
export async function calculateSolisScore(
  symbol: string
): Promise<SolisScoreResult> {
  console.log(`[Solis Score] Calculating for ${symbol}...`);

  const metadata = ASSET_METADATA[symbol];
  if (!metadata) {
    throw new Error(`Unknown asset: ${symbol}`);
  }

  // Calculate all components in parallel
  const [
    custodySecurity,
    liquidityDepth,
    holderDistribution,
    tradingActivity,
    pegStability,
  ] = await Promise.all([
    Promise.resolve(calculateCustodyScore(metadata)),
    calculateLiquidityScore(metadata.mint),
    calculateDistributionScore(metadata.mint),
    calculateTradingScore(metadata.mint),
    calculatePegScore(metadata.mint),
  ]);

  const redemptionSpeed = calculateRedemptionScore(metadata);

  // Sum all components
  const totalScore = Math.round(
    custodySecurity +
    liquidityDepth +
    holderDistribution +
    tradingActivity +
    pegStability +
    redemptionSpeed
  );

  const { grade, label } = getGrade(totalScore);

  console.log(`[Solis Score] ${symbol}: ${totalScore}/100 (${grade})`);
  console.log(`[Solis Score] Breakdown: Custody=${custodySecurity}, Liquidity=${liquidityDepth}, Holders=${holderDistribution}, Trading=${tradingActivity}, Peg=${pegStability}, Redemption=${redemptionSpeed}`);

  return {
    totalScore,
    grade,
    label,
    breakdown: {
      custodySecurity,
      liquidityDepth,
      holderDistribution,
      tradingActivity,
      pegStability,
      redemptionSpeed,
    },
  };
}

/**
 * Quick score calculation (uses cached/static data where possible)
 */
export async function getQuickScore(symbol: string): Promise<number> {
  try {
    const result = await calculateSolisScore(symbol);
    return result.totalScore;
  } catch (error) {
    console.error('[Solis Score] Quick score failed:', error);
    return 0;
  }
}
