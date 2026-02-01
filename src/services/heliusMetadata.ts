// @ts-nocheck
/**
 * HELIUS TOKEN METADATA SERVICE (Verified Jan 2026)
 * Fetches token metadata including logos by mint address
 * No wallet connection required - works for any token
 */

import { SOLIS_CONFIG } from './config';

interface TokenMetadata {
  symbol: string;
  name: string;
  logoURI?: string;
  mint: string;
}

export async function getTokenMetadata(mintAddress: string): Promise<TokenMetadata | null> {
  try {
    const response = await fetch(SOLIS_CONFIG.HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'token-metadata',
        method: 'getAsset',
        params: {
          id: mintAddress,
          displayOptions: {
            showFungible: true,
          }
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Helius failed: ${response.status}`);
    }

    const data = await response.json();
    const asset = data.result;

    if (!asset) {
      console.log(`[Solis] No Helius metadata for ${mintAddress}`);
      return null;
    }

    return {
      symbol: asset.content?.metadata?.symbol || '',
      name: asset.content?.metadata?.name || '',
      logoURI: asset.content?.links?.image || undefined,
      mint: mintAddress,
    };
  } catch (error) {
    console.error(`[Solis] Helius metadata error for ${mintAddress}:`, error);
    return null;
  }
}

/**
 * Batch fetch metadata for multiple tokens
 */
export async function getBatchTokenMetadata(mintAddresses: string[]): Promise<Map<string, TokenMetadata>> {
  const results = new Map<string, TokenMetadata>();
  
  // Fetch all in parallel
  const promises = mintAddresses.map(async (mint) => {
    const metadata = await getTokenMetadata(mint);
    if (metadata) {
      results.set(mint, metadata);
    }
  });

  await Promise.all(promises);
  return results;
}
