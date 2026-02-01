// @ts-nocheck
/**
 * HELIUS TOP HOLDERS SERVICE (Verified Jan 2026)
 * Fetches largest token holders for Solis Score calculation
 */

import { SOLIS_CONFIG } from './config';

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

export async function getTopHolders(
  mintAddress: string
): Promise<{ holders: HolderData[]; topHolderConcentration: number }> {
  try {
    const response = await fetch(SOLIS_CONFIG.HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      return { holders: [], topHolderConcentration: 0 };
    }

    const totalSupply = accounts.reduce((sum, acc) => sum + acc.uiAmount, 0);
    const holders: HolderData[] = accounts
      .map(acc => ({
        address: acc.address,
        balance: acc.uiAmount,
        percentage: (acc.uiAmount / totalSupply) * 100,
      }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 20);

    const topHolderConcentration = holders[0]?.percentage || 0;

    console.log(
      `[Solis] Top holder owns ${topHolderConcentration.toFixed(2)}% of supply`
    );

    return { holders, topHolderConcentration };
  } catch (error) {
    console.error('[Solis] Failed to fetch top holders:', error);
    return { holders: [], topHolderConcentration: 0 };
  }
}

export function calculateHolderScore(topHolderPercentage: number): number {
  if (topHolderPercentage === 0) return 0;
  if (topHolderPercentage < 5) return 15;
  if (topHolderPercentage < 10) return 13;
  if (topHolderPercentage < 15) return 11;
  if (topHolderPercentage < 25) return 8;
  if (topHolderPercentage < 40) return 5;
  return 2;
}

export async function getHolderConcentration(mintAddress: string): Promise<number> {
  const { topHolderConcentration } = await getTopHolders(mintAddress);
  return topHolderConcentration;
}
