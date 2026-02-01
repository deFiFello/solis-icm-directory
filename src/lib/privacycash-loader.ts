// PrivacyCash SDK loader - loads at runtime to avoid SSR WASM issues
// This file should only be imported dynamically on client side

import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=ee6c2238-42f8-4582-b9e5-3180f450b998";
const LAMPORTS_PER_SOL = 1_000_000_000;
const USDC_DECIMALS = 6;
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// SDK instances - loaded once
let encryptionService: any = null;
let lightWasm: any = null;
let sdkLoaded = false;

export interface PrivacyCashSDK {
  encryptionService: any;
  lightWasm: any;
}

/**
 * Load and initialize the PrivacyCash SDK
 * Must be called after user signs the authentication message
 */
export async function loadPrivacyCashSDK(signature: Uint8Array): Promise<PrivacyCashSDK> {
  if (sdkLoaded && encryptionService && lightWasm) {
    return { encryptionService, lightWasm };
  }

  console.log("[PrivacyCash] Loading SDK...");

  // Dynamic imports - these will load the WASM at runtime
  const { EncryptionService } = await import("privacycash/utils");
  const hasher = await import("@lightprotocol/hasher.rs");

  // Initialize WASM hasher
  console.log("[PrivacyCash] Initializing WASM hasher...");
  lightWasm = await hasher.WasmFactory.getInstance();

  // Create and initialize encryption service
  console.log("[PrivacyCash] Deriving encryption key from signature...");
  encryptionService = new EncryptionService();
  encryptionService.deriveEncryptionKeyFromSignature(signature);

  sdkLoaded = true;
  console.log("[PrivacyCash] SDK loaded successfully");

  return { encryptionService, lightWasm };
}

/**
 * Get private SOL balance
 */
export async function getPrivateBalanceSOL(
  publicKey: PublicKey,
  encryptionService: any
): Promise<number> {
  const { getUtxos, getBalanceFromUtxos } = await import("privacycash/utils");
  
  const connection = new Connection(HELIUS_RPC, "confirmed");
  
  // Use browser localStorage
  const storage = window.localStorage;

  const utxos = await getUtxos({
    publicKey,
    connection,
    encryptionService,
    storage,
  });

  const { lamports } = getBalanceFromUtxos(utxos);
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Get private USDC balance
 */
export async function getPrivateBalanceUSDC(
  publicKey: PublicKey,
  encryptionService: any
): Promise<number> {
  const { getUtxosSPL, getBalanceFromUtxosSPL } = await import("privacycash/utils");
  
  const connection = new Connection(HELIUS_RPC, "confirmed");
  const storage = window.localStorage;
  const usdcMint = new PublicKey(USDC_MINT);

  try {
    const utxos = await getUtxosSPL({
      publicKey,
      connection,
      encryptionService,
      storage,
      mintAddress: usdcMint,
    });

    const { base_units } = getBalanceFromUtxosSPL(utxos);
    return base_units / Math.pow(10, USDC_DECIMALS);
  } catch (err) {
    console.warn("[PrivacyCash] Could not get USDC balance:", err);
    return 0;
  }
}

/**
 * Deposit SOL to privacy pool
 */
export async function depositSOL(
  publicKey: PublicKey,
  amountSOL: number,
  encryptionService: any,
  lightWasm: any,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const { deposit } = await import("privacycash/utils");
    
    const connection = new Connection(HELIUS_RPC, "confirmed");
    const storage = window.localStorage;
    const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

    console.log(`[PrivacyCash] Depositing ${amountSOL} SOL (${lamports} lamports)...`);

    const result = await deposit({
      publicKey,
      connection,
      amount_in_lamports: lamports,
      storage,
      encryptionService,
      keyBasePath: '/circuit2/transaction2',
      lightWasm,
      transactionSigner: signTransaction,
    });

    console.log("[PrivacyCash] Deposit successful:", result.tx);
    return { success: true, signature: result.tx };
  } catch (err: any) {
    console.error("[PrivacyCash] Deposit failed:", err);
    return { success: false, error: err.message || "Deposit failed" };
  }
}

/**
 * Deposit USDC to privacy pool
 */
export async function depositUSDC(
  publicKey: PublicKey,
  amountUSDC: number,
  encryptionService: any,
  lightWasm: any,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const { depositSPL } = await import("privacycash/utils");
    
    const connection = new Connection(HELIUS_RPC, "confirmed");
    const storage = window.localStorage;
    const baseUnits = Math.floor(amountUSDC * Math.pow(10, USDC_DECIMALS));
    const usdcMint = new PublicKey(USDC_MINT);

    console.log(`[PrivacyCash] Depositing ${amountUSDC} USDC (${baseUnits} base units)...`);

    const result = await depositSPL({
      publicKey,
      connection,
      base_units: baseUnits,
      mintAddress: usdcMint,
      storage,
      encryptionService,
      keyBasePath: "/circuit2/transaction2",
      lightWasm,
      transactionSigner: signTransaction,
    });

    console.log("[PrivacyCash] USDC Deposit successful:", result.tx);
    return { success: true, signature: result.tx };
  } catch (err: any) {
    console.error("[PrivacyCash] USDC Deposit failed:", err);
    return { success: false, error: err.message || "USDC Deposit failed" };
  }
}

/**
 * Withdraw SOL from privacy pool
 */
export async function withdrawSOL(
  publicKey: PublicKey,
  amountSOL: number,
  recipientAddress: string,
  encryptionService: any,
  lightWasm: any
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const { withdraw } = await import("privacycash/utils");
    
    const connection = new Connection(HELIUS_RPC, "confirmed");
    const storage = window.localStorage;
    const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);
    const recipient = new PublicKey(recipientAddress);

    console.log(`[PrivacyCash] Withdrawing ${amountSOL} SOL to ${recipientAddress}...`);

    const result = await withdraw({
      publicKey,
      connection,
      amount_in_lamports: lamports,
      recipient,
      storage,
      encryptionService,
      keyBasePath: "/circuit2/transaction2",
      lightWasm,
    });

    console.log("[PrivacyCash] Withdraw successful:", result.tx);
    return { success: true, signature: result.tx };
  } catch (err: any) {
    console.error("[PrivacyCash] Withdraw failed:", err);
    return { success: false, error: err.message || "Withdrawal failed" };
  }
}

/**
 * Withdraw USDC from privacy pool
 */
export async function withdrawUSDC(
  publicKey: PublicKey,
  amountUSDC: number,
  recipientAddress: string,
  encryptionService: any,
  lightWasm: any
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const { withdrawSPL } = await import("privacycash/utils");
    
    const connection = new Connection(HELIUS_RPC, "confirmed");
    const storage = window.localStorage;
    const baseUnits = Math.floor(amountUSDC * Math.pow(10, USDC_DECIMALS));
    const usdcMint = new PublicKey(USDC_MINT);
    const recipient = new PublicKey(recipientAddress);

    console.log(`[PrivacyCash] Withdrawing ${amountUSDC} USDC to ${recipientAddress}...`);

    const result = await withdrawSPL({
      publicKey,
      connection,
      base_units: baseUnits,
      mintAddress: usdcMint,
      recipient,
      storage,
      encryptionService,
      keyBasePath: "/circuit2/transaction2",
      lightWasm,
    });

    console.log("[PrivacyCash] USDC Withdraw successful:", result.tx);
    return { success: true, signature: result.tx };
  } catch (err: any) {
    console.error("[PrivacyCash] USDC Withdraw failed:", err);
    return { success: false, error: err.message || "USDC Withdrawal failed" };
  }
}

/**
 * Check if SDK is loaded
 */
export function isSDKLoaded(): boolean {
  return sdkLoaded;
}

/**
 * Reset SDK state (for wallet disconnect)
 */
export function resetSDK(): void {
  encryptionService = null;
  lightWasm = null;
  sdkLoaded = false;
}
