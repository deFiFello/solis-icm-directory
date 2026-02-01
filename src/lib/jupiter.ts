// @ts-nocheck
// Jupiter Metis Swap API — Solis fee collection (Option B)
// Uses fee wallet's ATAs. Avoids WSOL (no persistent ATA).
// Falls back to no-fee swap if feeAccount is invalid.

import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const JUPITER_API = "https://api.jup.ag/swap/v1";
const JUPITER_API_KEY = "8b7d0011-2e6b-47b6-a597-2e2e36100f47";

// Solis fee collection wallet
const FEE_WALLET = new PublicKey("EMp2t1K5Du4sQLA5v2YGKfCWjsLE2T5eNbhYjGGLRcLo");

// Native SOL mint — WSOL ATA unlikely to exist, avoid using as fee mint
const NATIVE_SOL = "So11111111111111111111111111111111111111112";

// Fee tiers in basis points
export const FEES = {
  STANDARD: 50,  // 0.5%
  PRIVATE: 75,   // 0.75%
};

export interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: {
    amount: string;
    feeBps: number;
  } | null;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}

export interface SwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

/**
 * Pick the best mint to collect fees in.
 * Avoids native SOL (WSOL ATA doesn't persist on most wallets).
 * Prefers: non-SOL output > non-SOL input > skip fees
 */
function pickFeeMint(inputMint: string, outputMint: string): string | null {
  // If output is NOT native SOL, collect fee in output
  if (outputMint !== NATIVE_SOL) return outputMint;
  // If output IS SOL but input is NOT SOL, collect fee in input
  if (inputMint !== NATIVE_SOL) return inputMint;
  // Both are SOL — can't collect fees (shouldn't happen but safe)
  return null;
}

/**
 * Get the fee wallet's ATA for a mint.
 */
function getFeeAccount(mint: string): string {
  const ata = getAssociatedTokenAddressSync(
    new PublicKey(mint),
    FEE_WALLET
  );
  return ata.toBase58();
}

/**
 * Get a quote from Jupiter.
 * platformFeeBps is always set — Jupiter deducts it from the swap.
 */
export async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  privateMode: boolean = false,
  slippageBps: number = 100
): Promise<QuoteResponse> {
  const feeBps = privateMode ? FEES.PRIVATE : FEES.STANDARD;

  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippageBps: slippageBps.toString(),
    platformFeeBps: feeBps.toString(),
  });

  const response = await fetch(`${JUPITER_API}/quote?${params}`, {
    headers: { "x-api-key": JUPITER_API_KEY },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Jupiter quote failed: ${error}`);
  }

  return response.json();
}

/**
 * Get swap transaction from Jupiter.
 * Smart fee routing: avoids WSOL, falls back to no-fee if ATA doesn't exist.
 */
export async function getSwapTransaction(
  quote: QuoteResponse,
  userPublicKey: string,
  priorityFee: number = 1000000
): Promise<SwapResponse> {
  const feeMint = pickFeeMint(quote.inputMint, quote.outputMint);
  const feeAccount = feeMint ? getFeeAccount(feeMint) : null;

  if (feeAccount) {
    console.log(`[Solis] Collecting fee in ${feeMint} → ATA: ${feeAccount}`);
  } else {
    console.log(`[Solis] No eligible fee mint, swapping without fees`);
  }

  // Try with fees first
  const body: any = {
    quoteResponse: quote,
    userPublicKey,
    prioritizationFeeLamports: priorityFee,
    dynamicComputeUnitLimit: true,
    dynamicSlippage: true,
  };

  if (feeAccount) {
    body.feeAccount = feeAccount;
  }

  const response = await fetch(`${JUPITER_API}/swap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": JUPITER_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();

    // If fee account caused the error, retry without it
    if (feeAccount && (errorText.includes("6025") || errorText.includes("InvalidTokenAccount") || errorText.includes("InvalidAccountData"))) {
      console.warn(`[Solis] Fee account invalid, retrying without fees...`);
      return getSwapTransactionNoFee(quote, userPublicKey, priorityFee);
    }

    throw new Error(`Jupiter swap failed: ${errorText}`);
  }

  const result = await response.json();

  // Check for simulation errors in the response body
  if (result.simulationError) {
    const simErr = JSON.stringify(result.simulationError);
    if (feeAccount && (simErr.includes("6025") || simErr.includes("Custom"))) {
      console.warn(`[Solis] Simulation failed with fee account, retrying without fees...`);
      return getSwapTransactionNoFee(quote, userPublicKey, priorityFee);
    }
  }

  return result;
}

/**
 * Fallback: get swap transaction without any fee collection.
 * Ensures swaps always work even if fee ATAs don't exist.
 */
async function getSwapTransactionNoFee(
  quote: QuoteResponse,
  userPublicKey: string,
  priorityFee: number
): Promise<SwapResponse> {
  // Re-quote without platformFeeBps
  const params = new URLSearchParams({
    inputMint: quote.inputMint,
    outputMint: quote.outputMint,
    amount: quote.inAmount,
    slippageBps: quote.slippageBps.toString(),
  });

  const quoteResp = await fetch(`${JUPITER_API}/quote?${params}`, {
    headers: { "x-api-key": JUPITER_API_KEY },
  });

  if (!quoteResp.ok) {
    throw new Error(`Jupiter re-quote failed: ${await quoteResp.text()}`);
  }

  const cleanQuote = await quoteResp.json();

  const response = await fetch(`${JUPITER_API}/swap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": JUPITER_API_KEY,
    },
    body: JSON.stringify({
      quoteResponse: cleanQuote,
      userPublicKey,
      prioritizationFeeLamports: priorityFee,
      dynamicComputeUnitLimit: true,
      dynamicSlippage: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Jupiter swap failed: ${await response.text()}`);
  }

  return response.json();
}

/**
 * Get fee info for display
 */
export function getFeeInfo(privateMode: boolean = false) {
  const feeBps = privateMode ? FEES.PRIVATE : FEES.STANDARD;
  return {
    feeBps,
    feePercent: feeBps / 100,
    label: privateMode ? "Private Swap" : "Standard Swap",
    description: privateMode
      ? "Includes auto-shield to privacy pool"
      : "Standard swap with MEV protection",
  };
}

/**
 * Format amount for display
 */
export function formatAmount(amount: number, decimals: number): string {
  if (decimals <= 2) return amount.toFixed(2);
  if (decimals <= 6) return amount.toFixed(4);
  return amount.toFixed(6);
}
