// @ts-nocheck
/**
 * JUPITER PRICE API V3 SERVICE (Verified Jan 2026)
 * Fetches verified token prices with high precision
 */

import { SOLIS_CONFIG } from './config';

interface JupPriceData {
  [mint: string]: {
    id: string;
    type: string;
    price: string;
    usdPrice: number;
    decimals: number;
  };
}

export async function getVerifiedPrice(mint: string): Promise<number> {
  const url = `https://api.jup.ag/price/v3/simple?ids=${mint}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": SOLIS_CONFIG.JUPITER_API_KEY,
        "Accept": "application/json",
      },
      next: { revalidate: 30 } as any,
    });

    if (!res.ok) {
      throw new Error(`Jupiter API failed: ${res.status}`);
    }

    const data = await res.json() as JupPriceData;
    return data[mint]?.usdPrice || 0;
  } catch (error) {
    console.error("[Solis] Jupiter price fetch failed:", error);
    return 0;
  }
}