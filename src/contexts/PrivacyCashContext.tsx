"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";

// Types
interface PrivacyCashResult {
  success: boolean;
  signature?: string;
  error?: string;
}

interface PrivacyCashContextType {
  // State
  isInitialized: boolean;
  isInitializing: boolean;
  privateBalanceSOL: number | null;
  privateBalanceUSDC: number | null;
  isLoadingBalance: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<boolean>;
  deposit: (amountSOL: number) => Promise<PrivacyCashResult>;
  depositUSDC: (amountUSDC: number) => Promise<PrivacyCashResult>;
  withdraw: (amountSOL: number, recipient: string) => Promise<PrivacyCashResult>;
  withdrawUSDC: (amountUSDC: number, recipient: string) => Promise<PrivacyCashResult>;
  refreshBalances: () => Promise<void>;
  clearError: () => void;
}

const PrivacyCashContext = createContext<PrivacyCashContextType | null>(null);

export function PrivacyCashProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, signMessage, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [privateBalanceSOL, setPrivateBalanceSOL] = useState<number | null>(null);
  const [privateBalanceUSDC, setPrivateBalanceUSDC] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for SDK instances
  const sdkRef = useRef<{ encryptionService: any; lightWasm: any } | null>(null);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Reset when wallet disconnects
  useEffect(() => {
    if (!connected || !publicKey) {
      setIsInitialized(false);
      setPrivateBalanceSOL(null);
      setPrivateBalanceUSDC(null);
      sdkRef.current = null;
      
      // Reset SDK state
      import("@/lib/privacycash-loader").then(({ resetSDK }) => {
        resetSDK();
      }).catch(() => {});
    }
  }, [connected, publicKey]);

  // Initialize PrivacyCash - sign message to derive encryption key
  const initialize = useCallback(async (): Promise<boolean> => {
    if (!publicKey || !signMessage) {
      setError("Wallet not connected or doesn't support message signing");
      return false;
    }

    if (isInitialized && sdkRef.current) {
      return true;
    }

    setIsInitializing(true);
    setError(null);

    try {
      // Sign the PrivacyCash authentication message
      const message = new TextEncoder().encode("Privacy Money account sign in");
      console.log("[PrivacyCash] Requesting signature...");
      const signature = await signMessage(message);
      console.log("[PrivacyCash] Signature received, loading SDK...");

      // Dynamically import and initialize the SDK
      const { loadPrivacyCashSDK } = await import("@/lib/privacycash-loader");
      const sdk = await loadPrivacyCashSDK(signature);
      sdkRef.current = sdk;

      setIsInitialized(true);
      console.log("[PrivacyCash] Initialization complete");
      
      // Fetch initial balances
      await refreshBalancesInternal();
      
      return true;
    } catch (err: any) {
      console.error("[PrivacyCash] Init error:", err);
      if (err.message?.toLowerCase().includes("user rejected")) {
        setError("Signature rejected. Privacy features require message signing.");
      } else if (err.message?.includes("wasm") || err.message?.includes("WebAssembly")) {
        setError("Failed to load privacy module. Your browser may not support WebAssembly.");
      } else {
        setError(err.message || "Failed to initialize privacy features");
      }
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [publicKey, signMessage, isInitialized]);

  // Internal balance refresh
  const refreshBalancesInternal = useCallback(async () => {
    if (!publicKey || !sdkRef.current) return;

    setIsLoadingBalance(true);
    try {
      const { getPrivateBalanceSOL, getPrivateBalanceUSDC } = await import("@/lib/privacycash-loader");
      
      // Get SOL balance
      const solBalance = await getPrivateBalanceSOL(publicKey, sdkRef.current.encryptionService);
      setPrivateBalanceSOL(solBalance);
      
      // Get USDC balance
      const usdcBalance = await getPrivateBalanceUSDC(publicKey, sdkRef.current.encryptionService);
      setPrivateBalanceUSDC(usdcBalance);
      
      console.log(`[PrivacyCash] Balances: ${solBalance} SOL, ${usdcBalance} USDC`);
    } catch (err) {
      console.error("[PrivacyCash] Error fetching balances:", err);
      setPrivateBalanceSOL(0);
      setPrivateBalanceUSDC(0);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [publicKey]);

  // Public balance refresh
  const refreshBalances = useCallback(async () => {
    if (!isInitialized) return;
    await refreshBalancesInternal();
  }, [isInitialized, refreshBalancesInternal]);

  // Deposit SOL to privacy pool
  const deposit = useCallback(async (amountSOL: number): Promise<PrivacyCashResult> => {
    if (!isInitialized || !publicKey || !signTransaction || !sdkRef.current) {
      return { success: false, error: "Privacy features not initialized" };
    }

    if (amountSOL <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }

    try {
      const { depositSOL } = await import("@/lib/privacycash-loader");
      
      const result = await depositSOL(
        publicKey,
        amountSOL,
        sdkRef.current.encryptionService,
        sdkRef.current.lightWasm,
        signTransaction
      );
      
      if (result.success) {
        await refreshBalancesInternal();
      }
      
      return result;
    } catch (err: any) {
      console.error("[PrivacyCash] Deposit error:", err);
      return { success: false, error: err.message || "Deposit failed" };
    }
  }, [isInitialized, publicKey, signTransaction, refreshBalancesInternal]);

  // Deposit USDC to privacy pool
  const depositUSDC = useCallback(async (amountUSDC: number): Promise<PrivacyCashResult> => {
    if (!isInitialized || !publicKey || !signTransaction || !sdkRef.current) {
      return { success: false, error: "Privacy features not initialized" };
    }

    if (amountUSDC <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }

    try {
      const { depositUSDC: depositUSDCFn } = await import("@/lib/privacycash-loader");
      
      const result = await depositUSDCFn(
        publicKey,
        amountUSDC,
        sdkRef.current.encryptionService,
        sdkRef.current.lightWasm,
        signTransaction
      );
      
      if (result.success) {
        await refreshBalancesInternal();
      }
      
      return result;
    } catch (err: any) {
      console.error("[PrivacyCash] USDC Deposit error:", err);
      return { success: false, error: err.message || "USDC Deposit failed" };
    }
  }, [isInitialized, publicKey, signTransaction, refreshBalancesInternal]);

  // Withdraw SOL from privacy pool
  const withdraw = useCallback(async (amountSOL: number, recipient: string): Promise<PrivacyCashResult> => {
    if (!isInitialized || !publicKey || !sdkRef.current) {
      return { success: false, error: "Privacy features not initialized" };
    }

    // Validate recipient
    try {
      new PublicKey(recipient);
    } catch {
      return { success: false, error: "Invalid recipient address" };
    }

    if (amountSOL <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }

    try {
      const { withdrawSOL } = await import("@/lib/privacycash-loader");
      
      const result = await withdrawSOL(
        publicKey,
        amountSOL,
        recipient,
        sdkRef.current.encryptionService,
        sdkRef.current.lightWasm
      );
      
      if (result.success) {
        await refreshBalancesInternal();
      }
      
      return result;
    } catch (err: any) {
      console.error("[PrivacyCash] Withdraw error:", err);
      return { success: false, error: err.message || "Withdrawal failed" };
    }
  }, [isInitialized, publicKey, refreshBalancesInternal]);

  // Withdraw USDC from privacy pool
  const withdrawUSDC = useCallback(async (amountUSDC: number, recipient: string): Promise<PrivacyCashResult> => {
    if (!isInitialized || !publicKey || !sdkRef.current) {
      return { success: false, error: "Privacy features not initialized" };
    }

    try {
      new PublicKey(recipient);
    } catch {
      return { success: false, error: "Invalid recipient address" };
    }

    if (amountUSDC <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }

    try {
      const { withdrawUSDC: withdrawUSDCFn } = await import("@/lib/privacycash-loader");
      
      const result = await withdrawUSDCFn(
        publicKey,
        amountUSDC,
        recipient,
        sdkRef.current.encryptionService,
        sdkRef.current.lightWasm
      );
      
      if (result.success) {
        await refreshBalancesInternal();
      }
      
      return result;
    } catch (err: any) {
      console.error("[PrivacyCash] USDC Withdraw error:", err);
      return { success: false, error: err.message || "USDC Withdrawal failed" };
    }
  }, [isInitialized, publicKey, refreshBalancesInternal]);

  return (
    <PrivacyCashContext.Provider
      value={{
        isInitialized,
        isInitializing,
        privateBalanceSOL,
        privateBalanceUSDC,
        isLoadingBalance,
        error,
        initialize,
        deposit,
        depositUSDC,
        withdraw,
        withdrawUSDC,
        refreshBalances,
        clearError,
      }}
    >
      {children}
    </PrivacyCashContext.Provider>
  );
}

export function usePrivacyCash() {
  const context = useContext(PrivacyCashContext);
  if (!context) {
    throw new Error("usePrivacyCash must be used within a PrivacyCashProvider");
  }
  return context;
}
