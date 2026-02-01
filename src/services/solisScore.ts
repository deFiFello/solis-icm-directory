// @ts-nocheck
/**
 * SOLIS SCORE ALGORITHM (DexScreener Version)
 * Calculates 0-100 score without Birdeye dependency
 * Uses: DexScreener, Helius, Jupiter
 */

import { getMarketData } from './dexScreener';
import { getHolderConcentration, calculateHolderScore } from './heliusHolders';
import { getVerifiedPrice } from './jupiterPrice';
import { BTC_MINTS } from './config';

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
  redemptionHours: number;
}

const ASSET_METADATA: Record<string, AssetMetadata> = {
  cbBTC: {
    symbol: 'cbBTC',
    mint: BTC_MINTS.cbBTC,
    custodyType: 'centralized',
    custodian: 'Coinbase',
    redemptionHours: 0.5,
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

// 1. CUSTODY SECURITY (25 points)
function calculateCustodyScore(metadata: AssetMetadata): number {
  if (metadata.custodyType === 'decentralized') {
    return 25;
  }
  const trustedCustodians = ['Coinbase', 'BitGo', 'Kraken'];
  if (trustedCustodians.includes(metadata.custodian)) {
    return 20;
  }
  return 15;
}

// 2. LIQUIDITY DEPTH (25 points)
async function calculateLiquidityScore(mint: string): Promise<number> {
  try {
    const marketData = await getMarketData(mint);
    const liquidity = marketData?.liquidity || 0;

    if (liquidity >= 10_000_000) return 25;
    if (liquidity >= 5_000_000) return 22;
    if (liquidity >= 2_000_000) return 19;
    if (liquidity >= 1_000_000) return 16;
    if (liquidity >= 500_000) return 12;
    if (liquidity >= 250_000) return 8;
    if (liquidity >= 100_000) return 5;
    return 2;
  } catch (error) {
    console.error('[Solis Score] Liquidity score failed:', error);
    return 0;
  }
}

// 3. HOLDER DISTRIBUTION (15 points)
async function calculateDistributionScore(mint: string): Promise<number> {
  try {
    const concentration = await getHolderConcentration(mint);
    return calculateHolderScore(concentration);
  } catch (error) {
    console.error('[Solis Score] Distribution score failed:', error);
    return 0;
  }
}

// 4. TRADING ACTIVITY (15 points) - DexScreener only
async function calculateTradingScore(mint: string): Promise<number> {
  try {
    const marketData = await getMarketData(mint);
    const volume24h = marketData?.volume24h || 0;

    // Volume scoring (15 points)
    if (volume24h >= 1_000_000) return 15;
    if (volume24h >= 500_000) return 12;
    if (volume24h >= 250_000) return 9;
    if (volume24h >= 100_000) return 6;
    if (volume24h >= 50_000) return 3;
    return 0;
  } catch (error) {
    console.error('[Solis Score] Trading score failed:', error);
    return 0;
  }
}

// 5. PEG STABILITY (10 points)
async function calculatePegScore(mint: string): Promise<number> {
  try {
    const [price, wbtcPrice] = await Promise.all([
      getVerifiedPrice(mint),
      getVerifiedPrice(BTC_MINTS.WBTC),
    ]);

    if (!price || !wbtcPrice) return 5;

    const deviation = Math.abs((price - wbtcPrice) / wbtcPrice) * 100;

    if (deviation < 0.25) return 10;
    if (deviation < 0.5) return 9;
    if (deviation < 1.0) return 7;
    if (deviation < 2.0) return 5;
    if (deviation < 3.0) return 3;
    return 1;
  } catch (error) {
    console.error('[Solis Score] Peg score failed:', error);
    return 5;
  }
}

// 6. REDEMPTION SPEED (10 points)
function calculateRedemptionScore(metadata: AssetMetadata): number {
  const hours = metadata.redemptionHours;
  if (hours <= 1) return 10;
  if (hours <= 6) return 8;
  if (hours <= 24) return 6;
  if (hours <= 72) return 4;
  return 2;
}

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

export async function calculateSolisScore(
  symbol: string
): Promise<SolisScoreResult> {
  console.log(`[Solis Score] Calculating for ${symbol}...`);

  const metadata = ASSET_METADATA[symbol];
  if (!metadata) {
    throw new Error(`Unknown asset: ${symbol}`);
  }

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
  console.log(
    `[Solis Score] Breakdown: Custody=${custodySecurity}, Liquidity=${liquidityDepth}, Holders=${holderDistribution}, Trading=${tradingActivity}, Peg=${pegStability}, Redemption=${redemptionSpeed}`
  );

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

export async function getQuickScore(symbol: string): Promise<number> {
  try {
    const result = await calculateSolisScore(symbol);
    return result.totalScore;
  } catch (error) {
    console.error('[Solis Score] Quick score failed:', error);
    return 0;
  }
}
