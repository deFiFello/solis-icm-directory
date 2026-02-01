// @ts-nocheck
/**
 * HELIUS TRANSACTIONS SERVICE (Jan 2026)
 * Fetches and parses recent swap transactions for tokens
 */

import { SOLIS_CONFIG } from './config';

export interface RecentSwap {
  signature: string;
  timestamp: number;
  type: 'SWAP' | 'TRANSFER';
  amount: number;
  amountUSD: number;
  fromToken: string;
  toToken: string;
  dex?: string;
}

/**
 * Get recent transactions for a token mint
 */
export async function getRecentTransactions(mintAddress: string, limit: number = 20) {
  try {
    const response = await fetch(SOLIS_CONFIG.HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'recent-txs',
        method: 'getSignaturesForAddress',
        params: [
          mintAddress,
          { limit }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Helius failed: ${response.status}`);
    }

    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('[Solis] Failed to fetch recent transactions:', error);
    return [];
  }
}

/**
 * Get enhanced transaction details from Helius
 * With retry logic for rate limits (429)
 */
export async function getEnhancedTransaction(signature: string, retries = 2): Promise<any> {
  try {
    const response = await fetch(
      `https://api.helius.xyz/v0/transactions/?api-key=${SOLIS_CONFIG.HELIUS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: [signature]
        })
      }
    );

    // Handle rate limiting with exponential backoff
    if (response.status === 429 && retries > 0) {
      const delay = (3 - retries) * 1500; // 1.5s, 3s
      console.log(`[Solis] Rate limited (429), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getEnhancedTransaction(signature, retries - 1);
    }

    if (!response.ok) {
      throw new Error(`Helius enhanced API failed: ${response.status}`);
    }

    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    // Only log first few errors to avoid spam
    if (retries === 2) {
      console.log('[Solis] Transaction fetch failed (will retry)');
    }
    return null;
  }
}

/**
 * Parse transaction to extract swap information
 */
function parseSwapFromTransaction(tx: any, mintAddress: string): RecentSwap | null {
  try {
    // Check if this is a swap transaction
    const swapEvent = tx.events?.swap?.[0];
    const tokenTransfers = tx.tokenTransfers || [];
    
    if (!swapEvent && tokenTransfers.length < 2) {
      return null;
    }

    // Find transfers involving our mint
    const relevantTransfer = tokenTransfers.find(
      (t: any) => t.mint === mintAddress
    );

    if (!relevantTransfer) {
      return null;
    }

    // Determine swap direction and amounts
    const amount = relevantTransfer.tokenAmount || 0;
    const timestamp = tx.timestamp || Math.floor(Date.now() / 1000);

    // Try to identify the DEX
    let dex = 'Unknown';
    if (tx.description?.includes('Jupiter')) dex = 'Jupiter';
    else if (tx.description?.includes('Orca')) dex = 'Orca';
    else if (tx.description?.includes('Raydium')) dex = 'Raydium';
    else if (tx.description?.includes('Meteora')) dex = 'Meteora';

    return {
      signature: tx.signature,
      timestamp,
      type: 'SWAP',
      amount,
      amountUSD: 0, // Will be calculated based on price
      fromToken: relevantTransfer.fromUserAccount || '',
      toToken: relevantTransfer.toUserAccount || '',
      dex
    };
  } catch (error) {
    console.error('[Solis] Error parsing transaction:', error);
    return null;
  }
}

/**
 * Get recent swaps for a token
 * VERY conservative to avoid rate limits
 */
export async function getRecentSwaps(
  mintAddress: string,
  currentPrice: number,
  limit: number = 5 // Reduced to 5 to avoid rate limits
): Promise<RecentSwap[]> {
  try {
    console.log('[Solis] Fetching recent swaps for', mintAddress);

    // Get recent transaction signatures (conservative: only 10)
    const signatures = await getRecentTransactions(mintAddress, 10);
    
    if (signatures.length === 0) {
      console.log('[Solis] No recent transactions found');
      return [];
    }

    console.log(`[Solis] Found ${signatures.length} recent transactions, will fetch ${Math.min(limit, 5)}`);

    // Fetch enhanced details for VERY LIMITED transactions to avoid rate limits
    const swaps: RecentSwap[] = [];
    const maxToFetch = Math.min(limit, 5); // NEVER fetch more than 5
    
    for (let i = 0; i < Math.min(signatures.length, maxToFetch); i++) {
      const sig = signatures[i];
      const enhancedTx = await getEnhancedTransaction(sig.signature);
      
      if (enhancedTx) {
        const swap = parseSwapFromTransaction(enhancedTx, mintAddress);
        
        if (swap) {
          // Calculate USD value
          swap.amountUSD = swap.amount * currentPrice;
          swaps.push(swap);
        }
      }

      // Large delay to avoid rate limits (600ms between requests)
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    console.log(`[Solis] Successfully parsed ${swaps.length} swap transactions`);
    return swaps;
  } catch (error) {
    console.error('[Solis] Failed to fetch recent swaps:', error);
    return [];
  }
}
