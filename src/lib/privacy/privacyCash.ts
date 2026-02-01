/**
 * PRIVACY CASH - Shielded Execution Layer
 * Uses Helius Private Sender + Jito Tips for MEV-protected swaps
 */

import { 
  Connection, 
  VersionedTransaction, 
  SystemProgram, 
  PublicKey, 
  TransactionMessage,
  TransactionInstruction
} from "@solana/web3.js";

const HELIUS_KEY = "ee6c2238-42f8-4582-b9e5-3180f450b998";
const SENDER_URL = `https://sender.helius-rpc.com/fast?api-key=${HELIUS_KEY}`;
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;

// Verified Helius Tip Wallet for priority inclusion
const HELIUS_TIP_WALLET = new PublicKey("5VY91ws6B2hMmBFRsXkoAAdsPHBJwRfBht4DXox3xkwn");

// Default tip for private transactions (0.0002 SOL)
const DEFAULT_TIP_LAMPORTS = 200000;

/**
 * Privacy Scanner - Assess pool depth for SwapGuard
 * Uses Helius DAS API to check asset liquidity
 */
export async function getAssetPrivacyScore(mint: string) {
  const response = await fetch(HELIUS_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "solis-privacy-check",
      method: "getAsset",
      params: { id: mint, displayOptions: { showFungibleTokens: true } }
    }),
  });

  const { result } = await response.json();
  const tokenInfo = result?.token_info;

  return {
    depth: tokenInfo?.price_info?.total_market_cap || 5000,
    isPoolActive: !result?.burnt && !!tokenInfo,
    symbol: tokenInfo?.symbol || "UNKNOWN"
  };
}

/**
 * Execute Shielded Swap via Helius Private Sender
 * MEV bots cannot see the transaction until it's confirmed
 */
export async function executeShieldedTransaction(
  signedTransaction: VersionedTransaction,
  tipLamports: number = DEFAULT_TIP_LAMPORTS
): Promise<{ signature: string; success: boolean; error?: string }> {
  try {
    const serialized = Buffer.from(signedTransaction.serialize()).toString("base64");
    
    const response = await fetch(SENDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sendTransaction",
        params: [
          serialized,
          {
            encoding: "base64",
            skipPreflight: true,
            maxRetries: 0
          }
        ]
      })
    });

    if (!response.ok) {
      return {
        signature: "",
        success: false,
        error: `HTTP error: ${response.status}`
      };
    }

    const result = await response.json();
    
    if (result.error) {
      return {
        signature: "",
        success: false,
        error: result.error.message || "Private sender failed"
      };
    }

    return {
      signature: result.result,
      success: true
    };
  } catch (error: any) {
    return {
      signature: "",
      success: false,
      error: error.message || "Unknown error"
    };
  }
}

/**
 * Create Jito tip instruction
 * Add this to transaction for priority bundle inclusion
 */
export function createTipInstruction(
  payerPubkey: PublicKey,
  tipLamports: number = DEFAULT_TIP_LAMPORTS
): TransactionInstruction {
  return SystemProgram.transfer({
    fromPubkey: payerPubkey,
    toPubkey: HELIUS_TIP_WALLET,
    lamports: tipLamports
  });
}

/**
 * Check if private mode is available for a given token pair
 * Currently enabled for all SOL output swaps
 */
export function isPrivateModeAvailable(outputMint: string): boolean {
  const SOL_MINT = "So11111111111111111111111111111111111111112";
  return outputMint === SOL_MINT;
}

/**
 * Get connection to Helius RPC
 */
export function getPrivateConnection(): Connection {
  return new Connection(HELIUS_RPC, "confirmed");
}

export { HELIUS_TIP_WALLET, DEFAULT_TIP_LAMPORTS };
