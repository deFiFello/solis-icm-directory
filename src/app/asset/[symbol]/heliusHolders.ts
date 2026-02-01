/**
 * HELIUS TOP HOLDERS SERVICE (Verified Jan 2026)
 * Fetches largest token holders for Solis Score calculation
 * Uses Helius RPC getTokenLargestAccounts method
 */

import { SOLIS_CONFIG } from '@/services/config';

interface TokenAccount {
  address: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}

export interface HolderData {
  address: string;
  balance: number;
  percentage: number;
}

/**
 * Get top token holders and calculate concentration
 */
export async function getTopHolders(
  mintAddress: string
): Promise<{ holders: HolderData[]; topHolderConcentration: number }> {
  try {
    const response = await fetch(SOLIS_CONFIG.HELIUS_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-top-holders',
        method: 'getTokenLargestAccounts',
        params: [mintAddress],
      }),
    });

    if (!response.ok) {
      throw new Error(`Helius failed: ${response.status}`);
    }

    const data = await response.json();
    const accounts: TokenAccount[] = data.result?.value || [];

    if (accounts.length === 0) {
      console.log(`[Solis] No holder data for ${mintAddress}`);
      return { holders: [], topHolderConcentration: 0 };
    }

    // Calculate total supply from all holders
    const totalSupply = accounts.reduce((sum, acc) => sum + acc.uiAmount, 0);

    // Convert to holder data with percentages
    const holders: HolderData[] = accounts
      .map(acc => ({
        address: acc.address,
        balance: acc.uiAmount,
        percentage: (acc.uiAmount / totalSupply) * 100,
      }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 20); // Top 20 holders

    // Top holder concentration (single largest holder)
    const topHolderConcentration = holders[0]?.percentage || 0;

    console.log(
      `[Solis] Top holder owns ${topHolderConcentration.toFixed(2)}% of ${mintAddress}`
    );

    return { holders, topHolderConcentration };
  } catch (error) {
    console.error('[Solis] Failed to fetch top holders:', error);
    return { holders: [], topHolderConcentration: 0 };
  }
}

/**
 * Calculate holder distribution score (0-15 points for Solis Score)
 * More decentralized = higher score
 */
export function calculateHolderScore(topHolderPercentage: number): number {
  if (topHolderPercentage === 0) {
    return 0; // No data
  }

  // Scoring thresholds
  if (topHolderPercentage < 5) return 15;   // Excellent distribution
  if (topHolderPercentage < 10) return 13;  // Very good
  if (topHolderPercentage < 15) return 11;  // Good
  if (topHolderPercentage < 25) return 8;   // Moderate
  if (topHolderPercentage < 40) return 5;   // Centralized
  return 2;                                  // Highly centralized
}

/**
 * Get quick holder concentration for scoring without full list
 */
export async function getHolderConcentration(mintAddress: string): Promise<number> {
  const { topHolderConcentration } = await getTopHolders(mintAddress);
  return topHolderConcentration;
}
