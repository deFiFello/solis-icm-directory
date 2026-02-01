"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction, PublicKey } from "@solana/web3.js";
import { getQuote, getSwapTransaction, type QuoteResponse, FEES } from "@/lib/jupiter";
import { usePrivacyCash } from "@/contexts/PrivacyCashContext";

// Token definitions with mint addresses
const TOKENS = [
  { symbol: "SOL", name: "Solana", mint: "So11111111111111111111111111111111111111112", decimals: 9, icon: "◎" },
  { symbol: "zBTC", name: "Zeus BTC", mint: "zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg", decimals: 8, icon: "₿" },
  { symbol: "cbBTC", name: "Coinbase BTC", mint: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij", decimals: 8, icon: "₿" },
  { symbol: "WBTC", name: "Wrapped BTC", mint: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh", decimals: 8, icon: "₿" },
  { symbol: "tBTC", name: "Threshold BTC", mint: "6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU", decimals: 8, icon: "₿" },
  { symbol: "USDC", name: "USD Coin", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, icon: "$" },
  { symbol: "USDT", name: "Tether USD", mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6, icon: "$" },
];

interface SwapCardProps {
  initialFromToken?: string | null;
}

export default function SwapCard({ initialFromToken }: SwapCardProps) {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  
  // PrivacyCash integration
  const {
    isInitialized: privacyInitialized,
    isInitializing: privacyInitializing,
    privateBalanceSOL,
    privateBalanceUSDC,
    isLoadingBalance,
    error: privacyError,
    initialize: initializePrivacy,
    deposit: depositToPrivacy,
    depositUSDC: depositUSDCToPrivacy,
    refreshBalances,
    clearError: clearPrivacyError,
  } = usePrivacyCash();

  // Token selection - handle both symbol and mint address as initialFromToken
  const [fromToken, setFromToken] = useState(() => {
    if (initialFromToken) {
      const found = TOKENS.find(t => 
        t.symbol.toLowerCase() === initialFromToken.toLowerCase() || 
        t.mint === initialFromToken
      );
      if (found) return found;
    }
    return TOKENS[1]; // default to zBTC
  });
  const [toToken, setToToken] = useState(TOKENS[0]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  // Amounts and quote
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Balances
  const [fromBalance, setFromBalance] = useState<number | null>(null);
  const [toBalance, setToBalance] = useState<number | null>(null);

  // Shield Mode toggle (replaces "Private Mode")
  const [shieldMode, setShieldMode] = useState(false);
  
  // Privacy vault expansion
  const [showPrivacyVault, setShowPrivacyVault] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawToken, setWithdrawToken] = useState<"SOL" | "USDC">("SOL");

  // Update from token when prop changes
  useEffect(() => {
    if (initialFromToken) {
      // Try to find by symbol first, then by mint address
      const token = TOKENS.find(t => 
        t.symbol.toLowerCase() === initialFromToken.toLowerCase() || 
        t.mint === initialFromToken
      );
      if (token) setFromToken(token);
    }
  }, [initialFromToken]);

  // Fetch balances
  useEffect(() => {
    if (!publicKey || !connection) {
      setFromBalance(null);
      setToBalance(null);
      return;
    }

    const fetchBalances = async () => {
      try {
        // From token balance
        if (fromToken.symbol === "SOL") {
          const balance = await connection.getBalance(publicKey);
          setFromBalance(balance / 1e9);
        } else {
          const response = await connection.getParsedTokenAccountsByOwner(publicKey, {
            mint: new PublicKey(fromToken.mint),
          });
          if (response.value.length > 0) {
            const balance = response.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            setFromBalance(balance);
          } else {
            setFromBalance(0);
          }
        }

        // To token balance
        if (toToken.symbol === "SOL") {
          const balance = await connection.getBalance(publicKey);
          setToBalance(balance / 1e9);
        } else {
          const response = await connection.getParsedTokenAccountsByOwner(publicKey, {
            mint: new PublicKey(toToken.mint),
          });
          if (response.value.length > 0) {
            const balance = response.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            setToBalance(balance);
          } else {
            setToBalance(0);
          }
        }
      } catch (err) {
        console.error("Error fetching balances:", err);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 15000);
    return () => clearInterval(interval);
  }, [publicKey, connection, fromToken, toToken]);

  // Fetch quote with debounce
  useEffect(() => {
    const fetchQuote = async () => {
      if (!fromAmount || parseFloat(fromAmount) <= 0) {
        setQuote(null);
        setToAmount("");
        return;
      }

      setQuoteLoading(true);
      setError(null);

      try {
        const amountInSmallestUnit = Math.floor(parseFloat(fromAmount) * Math.pow(10, fromToken.decimals));
        const quoteResponse = await getQuote(
          fromToken.mint,
          toToken.mint,
          amountInSmallestUnit,
          shieldMode
        );
        setQuote(quoteResponse);
        const outAmount = parseInt(quoteResponse.outAmount) / Math.pow(10, toToken.decimals);
        setToAmount(outAmount.toFixed(toToken.decimals > 4 ? 6 : 2));
      } catch (err) {
        console.error("Quote error:", err);
        setError("Unable to get quote. Try a different amount.");
        setQuote(null);
        setToAmount("");
      } finally {
        setQuoteLoading(false);
      }
    };

    const debounce = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounce);
  }, [fromAmount, fromToken, toToken, shieldMode]);

  // Swap tokens
  const handleSwapTokens = () => {
    const tempToken = fromToken;
    const tempAmount = fromAmount;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount(tempAmount);
    // Reset shield mode if new output isn't shieldable
    if (fromToken.symbol !== "SOL" && fromToken.symbol !== "USDC") {
      setShieldMode(false);
    }
  };

  // Handle shield mode toggle
  const handleShieldToggle = async () => {
    if (!shieldMode && !privacyInitialized) {
      // Need to initialize PrivacyCash first
      const success = await initializePrivacy();
      if (success) {
        setShieldMode(true);
      }
    } else {
      setShieldMode(!shieldMode);
    }
  };

  // Execute swap (with optional shield)
  const handleSwap = async () => {
    if (!publicKey || !signTransaction || !quote) return;

    if (parseFloat(fromAmount) <= 0) {
      setError("Please enter an amount");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Refresh quote to avoid stale routes
      console.log("[Solis] Refreshing quote before swap...");
      console.log("[Solis] From:", fromToken.symbol, "decimals:", fromToken.decimals);
      console.log("[Solis] To:", toToken.symbol, "decimals:", toToken.decimals);
      
      // Use token's actual decimals
      const amountInSmallestUnit = Math.floor(parseFloat(fromAmount) * Math.pow(10, fromToken.decimals));
      console.log("[Solis] Amount in smallest unit:", amountInSmallestUnit);
      
      const freshQuote = await getQuote(
        fromToken.mint,
        toToken.mint,
        amountInSmallestUnit,
        shieldMode,
        100 // 1% slippage
      );
      
      console.log("[Solis] Fresh quote received, output:", freshQuote.outAmount);
      
      // Update expected output from fresh quote using actual decimals
      const freshToAmount = (parseInt(freshQuote.outAmount) / Math.pow(10, toToken.decimals)).toFixed(toToken.decimals >= 8 ? 8 : 4);

      // Step 1: Execute the swap
      console.log("[Solis] Getting swap transaction...");
      const { swapTransaction } = await getSwapTransaction(freshQuote, publicKey.toBase58());
      const transactionBuf = Buffer.from(swapTransaction, "base64");
      const transaction = VersionedTransaction.deserialize(transactionBuf);
      
      console.log("[Solis] Signing transaction...");
      const signedTransaction = await signTransaction(transaction);
      
      // Simulate first to catch errors
      console.log("[Solis] Simulating transaction...");
      try {
        const simulation = await connection.simulateTransaction(signedTransaction, {
          commitment: "confirmed",
        });
        if (simulation.value.err) {
          console.error("[Solis] Simulation failed:", simulation.value.err);
          console.error("[Solis] Logs:", simulation.value.logs);
          throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}. Check console for logs.`);
        }
        console.log("[Solis] Simulation passed");
      } catch (simErr: any) {
        // If simulation fails with specific error, show it
        if (simErr.message?.includes("Simulation failed")) {
          throw simErr;
        }
        // Otherwise just log and continue (some wallets don't support simulation)
        console.warn("[Solis] Simulation skipped:", simErr.message);
      }
      
      console.log("[Solis] Sending transaction...");
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });
      
      console.log("[Solis] Transaction sent:", signature);
      setSuccess(`Transaction sent! Confirming... (${signature.slice(0, 8)}...)`);

      const confirmation = await connection.confirmTransaction(signature, "confirmed");
      
      if (confirmation.value.err) {
        console.error("[Solis] Transaction error:", confirmation.value.err);
        throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log("[Solis] Swap confirmed!");

      // Step 2: If shield mode, deposit to privacy pool
      if (shieldMode && privacyInitialized) {
        const outputAmount = parseFloat(freshToAmount);
        
        setSuccess(`Swap complete! Shielding ${freshToAmount} ${toToken.symbol}...`);
        
        // Small delay to ensure swap is processed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        let depositResult;
        if (toToken.symbol === "SOL") {
          depositResult = await depositToPrivacy(outputAmount);
        } else if (toToken.symbol === "USDC") {
          depositResult = await depositUSDCToPrivacy(outputAmount);
        }
        
        if (depositResult && !depositResult.success) {
          // Swap succeeded but shield failed - not critical
          setSuccess(`Swapped ${fromAmount} ${fromToken.symbol} → ${freshToAmount} ${toToken.symbol}. Shield pending: ${depositResult.error}`);
        } else {
          setSuccess(`Swapped and shielded ${fromAmount} ${fromToken.symbol} → ${freshToAmount} ${toToken.symbol} 🔒`);
        }
      } else {
        setSuccess(`Swapped ${fromAmount} ${fromToken.symbol} → ${freshToAmount} ${toToken.symbol}`);
      }
      
      setFromAmount("");
      setToAmount("");
      setQuote(null);

    } catch (err: any) {
      console.error("Swap error:", err);
      
      // Parse more specific error messages
      let errorMessage = "Swap failed. Please try again.";
      if (err.message) {
        if (err.message.includes("insufficient")) {
          errorMessage = "Insufficient balance for this swap";
        } else if (err.message.includes("slippage")) {
          errorMessage = "Price moved too much. Try again with higher slippage.";
        } else if (err.message.includes("rejected") || err.message.includes("cancelled")) {
          errorMessage = "Transaction was rejected";
        } else if (err.message.includes("quote") || err.message.includes("Quote")) {
          errorMessage = "Could not get quote. Try a different amount or pair.";
        } else if (err.message.includes("Simulation failed")) {
          errorMessage = err.message;
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Percentage buttons
  const handlePercentage = (percent: number) => {
    if (fromBalance === null) return;
    
    let amount = fromBalance * (percent / 100);
    
    // Reserve SOL for fees
    if (fromToken.symbol === "SOL") {
      amount = Math.max(0, amount - 0.01);
    }
    
    setFromAmount(amount > 0 ? amount.toFixed(fromToken.decimals > 4 ? 6 : 4) : "");
  };

  // Check if Shield Mode is available (SOL or USDC output)
  const shieldModeAvailable = toToken.symbol === "SOL" || toToken.symbol === "USDC";

  // Calculate effective fee
  const effectiveFee = shieldMode ? FEES.PRIVATE : FEES.STANDARD;

  return (
    <div className="border border-slate-800 rounded-lg p-6 bg-black/50 backdrop-blur-sm">
      {/* From Token */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span className="tracking-widest uppercase">You Pay</span>
          <span>Balance: {fromBalance !== null ? fromBalance.toFixed(4) : "—"} {fromToken.symbol}</span>
        </div>
        
        <div className="flex gap-2">
          {/* Token Selector */}
          <div className="relative">
            <button
              onClick={() => setShowFromDropdown(!showFromDropdown)}
              className="flex items-center gap-2 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-500 transition-colors"
            >
              <span className="text-lg">{fromToken.icon}</span>
              <span className="font-bold">{fromToken.symbol}</span>
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showFromDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                {TOKENS.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => {
                      if (token.symbol !== toToken.symbol) {
                        setFromToken(token);
                      }
                      setShowFromDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-800 transition-colors text-left ${
                      token.symbol === fromToken.symbol ? "bg-slate-800" : ""
                    } ${token.symbol === toToken.symbol ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={token.symbol === toToken.symbol}
                  >
                    <span className="text-lg">{token.icon}</span>
                    <div>
                      <div className="font-bold text-sm">{token.symbol}</div>
                      <div className="text-xs text-slate-500">{token.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Input Amount */}
          <input
            type="number"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-right text-xl font-mono focus:outline-none focus:border-slate-500"
          />
        </div>

        {/* Percentage buttons */}
        <div className="flex gap-2 mt-2">
          {[25, 50, 75, 100].map((percent) => (
            <button
              key={percent}
              onClick={() => handlePercentage(percent)}
              className="flex-1 py-1.5 text-xs text-slate-500 border border-slate-800 rounded hover:border-slate-600 hover:text-slate-300 transition-colors"
            >
              {percent === 100 ? "MAX" : `${percent}%`}
            </button>
          ))}
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center my-3">
        <button
          onClick={handleSwapTokens}
          className="p-2 border border-slate-700 rounded-lg hover:border-slate-500 hover:bg-slate-900 transition-colors"
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* To Token */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span className="tracking-widest uppercase">You Receive</span>
          <span>Balance: {toBalance !== null ? toBalance.toFixed(4) : "—"} {toToken.symbol}</span>
        </div>
        
        <div className="flex gap-2">
          {/* Token Selector */}
          <div className="relative">
            <button
              onClick={() => setShowToDropdown(!showToDropdown)}
              className="flex items-center gap-2 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-500 transition-colors"
            >
              <span className="text-lg">{toToken.icon}</span>
              <span className="font-bold">{toToken.symbol}</span>
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showToDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                {TOKENS.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => {
                      if (token.symbol !== fromToken.symbol) {
                        setToToken(token);
                        // Reset shield mode if not shieldable
                        if (token.symbol !== "SOL" && token.symbol !== "USDC") {
                          setShieldMode(false);
                        }
                      }
                      setShowToDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-800 transition-colors text-left ${
                      token.symbol === toToken.symbol ? "bg-slate-800" : ""
                    } ${token.symbol === fromToken.symbol ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={token.symbol === fromToken.symbol}
                  >
                    <span className="text-lg">{token.icon}</span>
                    <div>
                      <div className="font-bold text-sm">{token.symbol}</div>
                      <div className="text-xs text-slate-500">{token.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Output Amount */}
          <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-right text-xl font-mono text-slate-300">
            {quoteLoading ? (
              <span className="text-slate-500">...</span>
            ) : (
              toAmount || "0.00"
            )}
          </div>
        </div>
      </div>

      {/* Shield Mode Toggle - PrivacyCash Integration */}
      {shieldModeAvailable && connected && (
        <div className="mb-4 p-3 border border-slate-800 rounded-lg bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${shieldMode ? "text-green-400" : "text-slate-400"}`}>
                🔒 Shield Output
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 uppercase tracking-wider">
                PrivacyCash
              </span>
            </div>
            <button
              onClick={handleShieldToggle}
              disabled={privacyInitializing}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                shieldMode ? "bg-green-500" : "bg-slate-700"
              } ${privacyInitializing ? "opacity-50" : ""}`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  shieldMode ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {privacyInitializing 
              ? "Initializing privacy features..." 
              : shieldMode 
                ? `Swap output → Privacy Pool (untraceable) · +0.25% fee`
                : "Auto-deposit to privacy pool after swap"
            }
          </p>
          
          {/* Privacy Vault Balances - Show when initialized */}
          {privacyInitialized && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Private Balances</span>
                <button 
                  onClick={refreshBalances}
                  className="text-xs text-slate-500 hover:text-slate-300"
                  disabled={isLoadingBalance}
                >
                  {isLoadingBalance ? "..." : "↻"}
                </button>
              </div>
              <div className="flex gap-4 mt-1">
                <span className="text-xs">
                  <span className="text-green-400">{privateBalanceSOL?.toFixed(4) ?? "0"}</span>
                  <span className="text-slate-500"> SOL</span>
                </span>
                <span className="text-xs">
                  <span className="text-green-400">{privateBalanceUSDC?.toFixed(2) ?? "0"}</span>
                  <span className="text-slate-500"> USDC</span>
                </span>
              </div>
              <button
                onClick={() => setShowPrivacyVault(!showPrivacyVault)}
                className="mt-2 text-xs text-purple-400 hover:text-purple-300"
              >
                {showPrivacyVault ? "Hide Vault ▲" : "Manage Vault ▼"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Privacy Vault Management */}
      {showPrivacyVault && privacyInitialized && (
        <div className="mb-4 p-3 border border-purple-500/30 rounded-lg bg-purple-500/5">
          <div className="text-xs text-purple-400 font-bold mb-3">PRIVACY VAULT</div>
          
          {/* Withdraw Section */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={withdrawToken}
                onChange={(e) => setWithdrawToken(e.target.value as "SOL" | "USDC")}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              >
                <option value="SOL">SOL</option>
                <option value="USDC">USDC</option>
              </select>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount"
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              />
            </div>
            <input
              type="text"
              value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              placeholder="Recipient address (fresh wallet)"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono"
            />
            <button
              onClick={async () => {
                if (!withdrawAmount || !withdrawAddress) return;
                setLoading(true);
                try {
                  const { withdraw, withdrawUSDC } = usePrivacyCash();
                  // This would call the actual withdraw
                  setSuccess("Withdraw functionality coming soon");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full py-2 bg-purple-500 hover:bg-purple-400 text-black text-xs font-bold rounded transition-colors"
            >
              Withdraw to Fresh Wallet
            </button>
            <p className="text-[10px] text-slate-500">
              Withdraw breaks the on-chain link between deposit and withdrawal using ZK proofs.
            </p>
          </div>
        </div>
      )}

      {/* Quote Info */}
      {quote && (
        <div className="mb-4 p-3 border border-slate-800 rounded-lg space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Rate</span>
            <span className="text-slate-300">
              1 {fromToken.symbol} ≈ {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(4)} {toToken.symbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Platform Fee</span>
            <span className={shieldMode ? "text-green-400" : "text-slate-300"}>
              {(effectiveFee / 100).toFixed(2)}%
              {shieldMode && " (Shield)"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Price Impact</span>
            <span className={`${
              parseFloat(quote.priceImpactPct) > 1 ? "text-yellow-400" : 
              parseFloat(quote.priceImpactPct) > 3 ? "text-red-400" : "text-slate-300"
            }`}>
              {parseFloat(quote.priceImpactPct).toFixed(2)}%
            </span>
          </div>
          {quote.routePlan && quote.routePlan.length > 1 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Route</span>
              <span className="text-slate-300">{quote.routePlan.length} hops</span>
            </div>
          )}
        </div>
      )}

      {/* Error / Success Messages */}
      {(error || privacyError) && (
        <div className="mb-4 p-3 border border-red-500/30 rounded-lg bg-red-500/10 text-red-400 text-sm">
          {error || privacyError}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 border border-green-500/30 rounded-lg bg-green-500/10 text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Swap Button */}
      {connected ? (
        <button
          onClick={handleSwap}
          disabled={loading || !quote || !fromAmount}
          className={`w-full py-4 rounded-lg font-bold tracking-wider uppercase transition-all btn-press ${
            shieldMode
              ? "bg-gradient-to-r from-green-500 to-purple-500 hover:from-green-400 hover:to-purple-400 text-black disabled:opacity-50"
              : "bg-white hover:bg-slate-100 text-black disabled:bg-slate-700 disabled:text-slate-500"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {shieldMode ? "Swapping & Shielding..." : "Swapping..."}
            </span>
          ) : shieldMode ? (
            <span className="flex items-center justify-center gap-2">
              🔒 Swap & Shield
            </span>
          ) : (
            "Swap"
          )}
        </button>
      ) : (
        <button
          onClick={() => setVisible(true)}
          className="w-full py-4 bg-white hover:bg-slate-100 text-black rounded-lg font-bold tracking-wider uppercase transition-all btn-press"
        >
          Connect Wallet
        </button>
      )}
      
      {/* PrivacyCash Attribution */}
      {shieldModeAvailable && (
        <div className="mt-3 text-center">
          <span className="text-[10px] text-slate-600">
            Privacy powered by{" "}
            <a 
              href="https://privacycash.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-500 hover:text-purple-400"
            >
              PrivacyCash
            </a>
            {" "}· ZK proofs on Solana
          </span>
        </div>
      )}
    </div>
  );
}
