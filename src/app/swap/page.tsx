"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { usePrivacyCash } from "@/contexts/PrivacyCashContext";
import { getQuote, getSwapTransaction, FEES } from "@/lib/jupiter";
import { SOLIS_ASSETS } from "@/services/config";
import { getTokenMetadata } from "@/services/heliusMetadata";
import Header from "@/components/Header";

// Build swap tokens from shared config (same source as homepage)
interface SwapToken {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  category: string;
  logoURI: string;
}

const CATEGORIES = [
  { id: "all", label: "ALL" },
  { id: "btc", label: "BTC WRAPPERS" },
  { id: "sol", label: "SOL" },
  { id: "stablecoin", label: "STABLECOINS" },
];

function mapCategory(cat: string): string {
  if (cat === "stable") return "stablecoin";
  if (cat === "crypto") return "sol";
  return cat;
}

function SwapPageContent() {
  const searchParams = useSearchParams();
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const {
    isInitialized: privacyInitialized,
    isInitializing: privacyInitializing,
    privateBalanceSOL,
    privateBalanceUSDC,
    initialize: initializePrivacy,
    deposit: depositToPrivacy,
    depositUSDC: depositUSDCToPrivacy,
    withdraw: withdrawFromPrivacy,
    withdrawUSDC: withdrawUSDCFromPrivacy,
    refreshBalances,
  } = usePrivacyCash();

  // Build tokens from shared config, resolve logos via Helius
  const [tokens, setTokens] = useState<SwapToken[]>(() =>
    SOLIS_ASSETS.map((a: any) => ({
      symbol: a.symbol,
      name: a.name,
      mint: a.mint,
      decimals: a.decimals,
      category: mapCategory(a.category),
      logoURI: a.logoURI || "",
    }))
  );

  useEffect(() => {
    async function resolveLogos() {
      const updated = await Promise.all(
        tokens.map(async (t) => {
          try {
            const meta = await getTokenMetadata(t.mint);
            if (meta?.logoURI) return { ...t, logoURI: meta.logoURI };
          } catch {}
          return t;
        })
      );
      setTokens(updated);
    }
    resolveLogos();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initialFrom = searchParams.get("from") || searchParams.get("input");

  const findToken = useCallback(
    (id: string | null) => {
      if (!id) return null;
      return tokens.find(
        (t) => t.symbol.toLowerCase() === id.toLowerCase() || t.mint === id
      );
    },
    [tokens]
  );

  const [fromToken, setFromToken] = useState<SwapToken>(() => {
    if (initialFrom) {
      const found = SOLIS_ASSETS.find(
        (a: any) =>
          a.symbol.toLowerCase() === initialFrom.toLowerCase() || a.mint === initialFrom
      );
      if (found) return { symbol: found.symbol, name: found.name, mint: found.mint as string, decimals: found.decimals, category: mapCategory(found.category), logoURI: (found as any).logoURI || "" };
    }
    const def = SOLIS_ASSETS[0];
    return { symbol: def.symbol, name: def.name, mint: def.mint as string, decimals: def.decimals, category: mapCategory(def.category), logoURI: (def as any).logoURI || "" };
  });

  const [toToken, setToToken] = useState<SwapToken>(() => {
    const sol = SOLIS_ASSETS.find((a: any) => a.symbol === "SOL")!;
    return { symbol: sol.symbol, name: sol.name, mint: sol.mint as string, decimals: sol.decimals, category: mapCategory(sol.category), logoURI: (sol as any).logoURI || "" };
  });

  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [fromFilter, setFromFilter] = useState("all");
  const [toFilter, setToFilter] = useState("all");
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fromBalance, setFromBalance] = useState<number | null>(null);
  const [toBalance, setToBalance] = useState<number | null>(null);
  const [shieldMode, setShieldMode] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawToken, setWithdrawToken] = useState<"SOL" | "USDC">("SOL");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);
  const shieldModeAvailable = toToken.symbol === "SOL" || toToken.symbol === "USDC";

  // Sync logos when resolved
  useEffect(() => {
    const uf = tokens.find((t) => t.mint === fromToken.mint);
    if (uf && uf.logoURI !== fromToken.logoURI) setFromToken((p) => ({ ...p, logoURI: uf.logoURI }));
    const ut = tokens.find((t) => t.mint === toToken.mint);
    if (ut && ut.logoURI !== toToken.logoURI) setToToken((p) => ({ ...p, logoURI: ut.logoURI }));
  }, [tokens]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const token = findToken(initialFrom);
    if (token) {
      setFromToken(token);
      if (token.category === "btc") { const s = tokens.find((t) => t.symbol === "SOL"); if (s) setToToken(s); }
      else if (token.symbol === "SOL") { const u = tokens.find((t) => t.symbol === "USDC"); if (u) setToToken(u); }
      else { const s = tokens.find((t) => t.symbol === "SOL"); if (s) setToToken(s); }
    }
  }, [initialFrom, findToken, tokens]);

  // Balances
  useEffect(() => {
    if (!publicKey || !connection) { setFromBalance(null); setToBalance(null); return; }
    const fetchBal = async (tok: SwapToken, set: (v: number) => void) => {
      try {
        if (tok.symbol === "SOL") { set((await connection.getBalance(publicKey)) / 1e9); }
        else {
          const r = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: new PublicKey(tok.mint) });
          set(r.value.length > 0 ? r.value[0].account.data.parsed.info.tokenAmount.uiAmount : 0);
        }
      } catch { set(0); }
    };
    fetchBal(fromToken, setFromBalance);
    fetchBal(toToken, setToBalance);
    const iv = setInterval(() => { fetchBal(fromToken, setFromBalance); fetchBal(toToken, setToBalance); }, 15000);
    return () => clearInterval(iv);
  }, [publicKey, connection, fromToken, toToken]);

  // Quote
  useEffect(() => {
    const go = async () => {
      if (!fromAmount || parseFloat(fromAmount) <= 0) { setQuote(null); setToAmount(""); return; }
      setQuoteLoading(true);
      try {
        const amt = Math.floor(parseFloat(fromAmount) * Math.pow(10, fromToken.decimals));
        const q = await getQuote(fromToken.mint, toToken.mint, amt, shieldMode, 100);
        setQuote(q);
        setToAmount((parseInt(q.outAmount) / Math.pow(10, toToken.decimals)).toFixed(toToken.decimals >= 8 ? 8 : toToken.decimals));
      } catch { setQuote(null); setToAmount(""); }
      finally { setQuoteLoading(false); }
    };
    const t = setTimeout(go, 500);
    return () => clearTimeout(t);
  }, [fromAmount, fromToken, toToken, shieldMode]);

  const handleSwapTokens = () => { const t = fromToken; setFromToken(toToken); setToToken(t); setFromAmount(toAmount); setToAmount(fromAmount); };

  const handlePercentage = (pct: number) => {
    if (fromBalance === null) return;
    let a = fromBalance * (pct / 100);
    if (fromToken.symbol === "SOL") a = Math.max(0, a - 0.01);
    setFromAmount(a > 0 ? a.toFixed(6) : "");
  };

  const handleSwap = async () => {
    if (!publicKey || !signTransaction || !quote) return;
    if (parseFloat(fromAmount) <= 0) { setError("Enter an amount"); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      const amt = Math.floor(parseFloat(fromAmount) * Math.pow(10, fromToken.decimals));
      const fq = await getQuote(fromToken.mint, toToken.mint, amt, shieldMode, 100);
      const fo = (parseInt(fq.outAmount) / Math.pow(10, toToken.decimals)).toFixed(toToken.decimals >= 8 ? 8 : 4);
      const { swapTransaction } = await getSwapTransaction(fq, publicKey.toBase58());
      const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
      const signed = await signTransaction(tx);
      try {
        const sim = await connection.simulateTransaction(signed, { commitment: "confirmed" });
        if (sim.value.err) { console.error("[Solis] Sim failed:", sim.value.err, sim.value.logs); throw new Error(`Simulation failed: ${JSON.stringify(sim.value.err)}`); }
      } catch (se: any) { if (se.message?.includes("Simulation failed")) throw se; }
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
      setSuccess(`Transaction sent. Confirming... (${sig.slice(0, 8)}...)`);
      const conf = await connection.confirmTransaction(sig, "confirmed");
      if (conf.value.err) throw new Error("Transaction failed on-chain");

      if (shieldMode && privacyInitialized) {
        setSuccess(`Swap confirmed. Shielding ${fo} ${toToken.symbol}...`);
        await new Promise((r) => setTimeout(r, 2000));
        let dep;
        if (toToken.symbol === "SOL") dep = await depositToPrivacy(parseFloat(fo));
        else if (toToken.symbol === "USDC") dep = await depositUSDCToPrivacy(parseFloat(fo));
        if (dep && !dep.success) setSuccess(`Swapped ${fromAmount} ${fromToken.symbol} to ${fo} ${toToken.symbol}. Shield pending: ${dep.error}`);
        else setSuccess(`Swapped and shielded ${fromAmount} ${fromToken.symbol} to ${fo} ${toToken.symbol}`);
      } else {
        setSuccess(`Swapped ${fromAmount} ${fromToken.symbol} to ${fo} ${toToken.symbol}`);
      }
      setFromAmount(""); setToAmount(""); setQuote(null);
    } catch (err: any) {
      console.error("Swap error:", err);
      let msg = "Swap failed. Try again.";
      if (err.message?.includes("insufficient")) msg = "Insufficient balance";
      else if (err.message?.includes("slippage")) msg = "Price moved too much. Try higher slippage.";
      else if (err.message?.includes("rejected")) msg = "Transaction rejected";
      else if (err.message) msg = err.message;
      setError(msg);
    } finally { setLoading(false); }
  };

  const handleShieldToggle = async () => {
    if (!shieldMode && !privacyInitialized) { const ok = await initializePrivacy(); if (ok) setShieldMode(true); }
    else setShieldMode(!shieldMode);
  };

  const handleWithdraw = async () => {
    if (!withdrawAddress || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setWithdrawMsg("Enter a valid amount and address");
      return;
    }
    setWithdrawing(true);
    setWithdrawMsg(null);
    try {
      const amt = parseFloat(withdrawAmount);
      const result = withdrawToken === "SOL"
        ? await withdrawFromPrivacy(amt, withdrawAddress)
        : await withdrawUSDCFromPrivacy(amt, withdrawAddress);
      if (result.success) {
        setWithdrawMsg(`Withdrew ${withdrawAmount} ${withdrawToken} to ${withdrawAddress.slice(0, 4)}...${withdrawAddress.slice(-4)}`);
        setWithdrawAmount("");
        setWithdrawAddress("");
        await refreshBalances();
      } else {
        setWithdrawMsg(result.error || "Withdrawal failed");
      }
    } catch (err: any) {
      setWithdrawMsg(err.message || "Withdrawal failed");
    } finally {
      setWithdrawing(false);
    }
  };

  const filteredFrom = useMemo(() => fromFilter === "all" ? tokens : tokens.filter((t) => t.category === fromFilter), [fromFilter, tokens]);
  const filteredTo = useMemo(() => toFilter === "all" ? tokens : tokens.filter((t) => t.category === toFilter), [toFilter, tokens]);

  const feePercent = shieldMode ? FEES.PRIVATE / 100 : FEES.STANDARD / 100;
  const priceImpact = quote?.priceImpactPct ? parseFloat(quote.priceImpactPct) : 0;
  const routeHops = quote?.routePlan?.length || 0;

  // Shared token icon
  const TIcon = ({ token, sz = 22 }: { token: SwapToken; sz?: number }) => {
    if (!token.logoURI) return <div style={{ width: sz, height: sz }} className="rounded-full bg-[#1a1a1a] flex items-center justify-center text-[9px] font-bold">{token.symbol[0]}</div>;
    return <img src={token.logoURI} alt={token.symbol} className="rounded-full" style={{ width: sz, height: sz }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  };

  // Dropdown
  const TDropdown = ({ list, selected, onSelect, filter, setFilter, show, setShow }: {
    list: SwapToken[]; selected: SwapToken; onSelect: (t: SwapToken) => void;
    filter: string; setFilter: (f: string) => void; show: boolean; setShow: (s: boolean) => void;
  }) => (
    <div className="relative">
      <button onClick={() => setShow(!show)} className="flex items-center gap-2 px-4 py-3 border border-[#222] hover:border-slate-700 transition-colors min-w-[130px]">
        <TIcon token={selected} sz={22} />
        <span className="font-bold text-sm">{selected.symbol}</span>
        <span className="text-text-muted text-[10px] ml-auto">&#9660;</span>
      </button>
      {show && (
        <div className="absolute z-50 mt-1 w-72 bg-black border border-[#222] shadow-2xl max-h-80 overflow-y-auto">
          <div className="p-2 border-b border-[#222] flex gap-1 flex-wrap">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setFilter(c.id)} className={`px-2 py-1 text-[10px] tracking-wider ${filter === c.id ? "bg-white text-black font-bold" : "text-[#666] hover:text-white"}`}>{c.label}</button>
            ))}
          </div>
          {list.map((t) => (
            <button key={t.mint} onClick={() => { onSelect(t); setShow(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#111] transition-colors text-left ${t.mint === selected.mint ? "bg-[#111]" : ""}`}>
              <TIcon token={t} sz={26} />
              <div>
                <div className="font-bold text-xs">{t.symbol}</div>
                <div className="text-[10px] text-[#666]">{t.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Header activePage="swap" />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* LEFT: Swap */}
          <div>
            <div className="flex items-center gap-1 text-[10px] text-[#666] mb-5 tracking-[0.2em] uppercase">
              {CATEGORIES.map((c, i) => (
                <span key={c.id}>
                  <button onClick={() => setFromFilter(c.id)} className={`hover:text-white transition-colors ${fromFilter === c.id ? "text-white font-bold" : ""}`}>{c.label}</button>
                  {i < CATEGORIES.length - 1 && <span className="mx-2 text-[#666]">·</span>}
                </span>
              ))}
            </div>

            <div className="border border-[#222] p-6">
              {/* YOU PAY */}
              <div className="mb-2">
                <div className="flex justify-between text-[10px] text-[#666] mb-2 tracking-[0.15em] uppercase">
                  <span>You Pay</span>
                  <span>Balance: {fromBalance !== null ? fromBalance.toFixed(4) : "--"} {fromToken.symbol}</span>
                </div>
                <div className="flex gap-2">
                  <TDropdown list={filteredFrom} selected={fromToken} onSelect={setFromToken} filter={fromFilter} setFilter={setFromFilter} show={showFromDropdown} setShow={setShowFromDropdown} />
                  <input type="number" value={fromAmount} onChange={(e) => setFromAmount(e.target.value)} placeholder="0.00"
                    className="flex-1 bg-black border border-[#222] px-4 py-3 text-right text-xl outline-none focus:border-[#444] transition-colors" />
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[25, 50, 75, 100].map((p) => (
                    <button key={p} onClick={() => handlePercentage(p)} className="py-1.5 text-[10px] tracking-wider border border-[#222] hover:border-slate-700 transition-colors">
                      {p === 100 ? "MAX" : `${p}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction */}
              <div className="flex justify-center my-3">
                <button onClick={handleSwapTokens} className="p-2 border border-[#222] hover:border-slate-700 transition-colors text-[#666] hover:text-white">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M8 2l3 3M8 2L5 5M8 14l3-3M8 14L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>

              {/* YOU RECEIVE */}
              <div className="mb-5">
                <div className="flex justify-between text-[10px] text-[#666] mb-2 tracking-[0.15em] uppercase">
                  <span>You Receive</span>
                  <span>Balance: {toBalance !== null ? toBalance.toFixed(4) : "--"} {toToken.symbol}</span>
                </div>
                <div className="flex gap-2">
                  <TDropdown list={filteredTo} selected={toToken} onSelect={setToToken} filter={toFilter} setFilter={setToFilter} show={showToDropdown} setShow={setShowToDropdown} />
                  <div className="flex-1 bg-black border border-[#222] px-4 py-3 text-right text-xl text-[#666]">
                    {quoteLoading ? <span className="animate-pulse">...</span> : toAmount || "0.00"}
                  </div>
                </div>
              </div>

              {/* Shield */}
              {shieldModeAvailable && (
                <div className={`mb-5 p-4 border transition-colors ${shieldMode ? "border-accent-purple/50 bg-accent-purple/5" : "border-[#222]"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">Shield Output</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-accent-purple/20 text-accent-purple tracking-wider font-bold">PRIVACYCASH</span>
                      </div>
                      <p className="text-[10px] text-[#666] mt-1 tracking-wide">
                        Auto-shield to privacy pool · Untraceable withdrawals · +0.25% fee
                      </p>
                    </div>
                    <button onClick={handleShieldToggle} disabled={privacyInitializing}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${shieldMode ? "bg-accent-purple" : "bg-[#1a1a1a] border border-[#222]"} ${privacyInitializing ? "opacity-50" : ""}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${shieldMode ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  {privacyInitialized && shieldMode && (
                    <div className="mt-3 pt-3 border-t border-[#222]">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#666] tracking-wider uppercase">Private Balances</span>
                        <div className="flex gap-3">
                          <button onClick={refreshBalances} className="text-[10px] text-accent-purple hover:underline">Refresh</button>
                          <button onClick={() => setShowWithdraw(!showWithdraw)} className="text-[10px] text-accent-purple hover:underline">
                            {showWithdraw ? "Hide" : "Withdraw"}
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs">
                        <span className="text-accent-purple">{privateBalanceSOL?.toFixed(4) || "0.0000"} SOL</span>
                        <span className="text-accent-purple">{privateBalanceUSDC?.toFixed(2) || "0.00"} USDC</span>
                      </div>

                      {/* Withdraw UI */}
                      {showWithdraw && (
                        <div className="mt-3 pt-3 border-t border-[#222] space-y-2">
                          <div className="flex gap-2">
                            <button onClick={() => setWithdrawToken("SOL")}
                              className={`flex-1 py-1.5 text-[10px] tracking-wider border transition-colors ${withdrawToken === "SOL" ? "border-accent-purple text-accent-purple" : "border-[#222] text-[#666]"}`}>
                              SOL ({privateBalanceSOL?.toFixed(4) || "0"})
                            </button>
                            <button onClick={() => setWithdrawToken("USDC")}
                              className={`flex-1 py-1.5 text-[10px] tracking-wider border transition-colors ${withdrawToken === "USDC" ? "border-accent-purple text-accent-purple" : "border-[#222] text-[#666]"}`}>
                              USDC ({privateBalanceUSDC?.toFixed(2) || "0"})
                            </button>
                          </div>
                          <input
                            type="number"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            placeholder="Amount"
                            className="w-full bg-black border border-[#222] px-3 py-2 text-sm outline-none focus:border-accent-purple/50 transition-colors"
                          />
                          <input
                            type="text"
                            value={withdrawAddress}
                            onChange={(e) => setWithdrawAddress(e.target.value)}
                            placeholder="Recipient wallet address"
                            className="w-full bg-black border border-[#222] px-3 py-2 text-sm outline-none focus:border-accent-purple/50 transition-colors font-mono text-[11px]"
                          />
                          <button
                            onClick={() => {
                              const max = withdrawToken === "SOL" ? privateBalanceSOL : privateBalanceUSDC;
                              if (max) setWithdrawAmount(max.toString());
                            }}
                            className="text-[10px] text-accent-purple hover:underline"
                          >
                            Max
                          </button>
                          {withdrawMsg && (
                            <p className={`text-[10px] ${withdrawMsg.includes("Withdrew") ? "text-accent-green" : "text-accent-red"}`}>
                              {withdrawMsg}
                            </p>
                          )}
                          <button
                            onClick={handleWithdraw}
                            disabled={withdrawing || !withdrawAmount || !withdrawAddress}
                            className={`w-full py-2 text-[10px] tracking-[0.2em] uppercase font-bold transition-all ${
                              withdrawing || !withdrawAmount || !withdrawAddress
                                ? "bg-[#1a1a1a] text-[#666] cursor-not-allowed"
                                : "bg-accent-purple hover:bg-accent-purple/80 text-white"
                            }`}
                          >
                            {withdrawing ? "Generating ZK proof..." : `Withdraw ${withdrawToken}`}
                          </button>
                          <p className="text-[9px] text-[#444]">
                            ZK proof breaks the on-chain link between deposit and withdrawal. Recipient cannot be traced back to your wallet.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Quote */}
              {quote && (
                <div className="mb-5 p-3 border border-[#222] text-[11px] space-y-1.5">
                  <div className="flex justify-between"><span className="text-[#666]">Rate</span><span>1 {fromToken.symbol} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toToken.symbol}</span></div>
                  <div className="flex justify-between"><span className="text-[#666]">Platform Fee</span><span className={shieldMode ? "text-accent-purple" : ""}>{feePercent}%{shieldMode ? " (Shield)" : ""}</span></div>
                  <div className="flex justify-between"><span className="text-[#666]">Price Impact</span><span className={priceImpact > 1 ? "text-accent-red" : ""}>{priceImpact.toFixed(2)}%</span></div>
                  <div className="flex justify-between"><span className="text-[#666]">Route</span><span>{routeHops} hop{routeHops !== 1 ? "s" : ""}</span></div>
                </div>
              )}

              {error && <div className="mb-4 p-3 bg-accent-red/10 border border-accent-red/30 text-accent-red text-[11px]">{error}</div>}
              {success && <div className="mb-4 p-3 bg-accent-green/10 border border-accent-green/30 text-accent-green text-[11px]">{success}</div>}

              {connected ? (
                <button onClick={handleSwap} disabled={loading || !quote || parseFloat(fromAmount) <= 0}
                  className={`w-full py-3.5 font-bold text-[11px] tracking-[0.2em] uppercase transition-all ${
                    loading || !quote || parseFloat(fromAmount) <= 0 ? "bg-[#1a1a1a] text-[#666] cursor-not-allowed"
                    : shieldMode ? "bg-accent-purple hover:bg-accent-purple/80 text-white"
                    : "bg-white text-black hover:bg-slate-200"
                  }`}>
                  {loading ? "Processing..." : shieldMode ? "Swap & Shield" : "Swap"}
                </button>
              ) : (
                <button onClick={() => setVisible(true)} className="w-full py-3.5 bg-white text-black font-bold text-[11px] tracking-[0.2em] uppercase hover:bg-slate-200 transition-colors">
                  Connect Wallet
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Info */}
          <div className="lg:pt-10">
            <p className="text-[10px] text-[#666] tracking-[0.25em] uppercase mb-2">Tokenized Capital Markets</p>
            <h1 className="text-3xl font-bold mb-3 tracking-tight">24/7 Trading</h1>
            <p className="text-[#a0a0a0] text-sm mb-8 leading-relaxed">
              Trade tokenized assets around the clock. No brokers, no banks, no market hours. Your custody, instant settlement.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-4 border border-[#222]">
                <p className="text-[9px] text-[#666] tracking-[0.2em] uppercase mb-1">Routing</p>
                <p className="text-base font-bold">Jupiter</p>
                <p className="text-[10px] text-[#666] mt-0.5">Best price aggregation</p>
              </div>
              <div className="p-4 border border-accent-purple/30 bg-accent-purple/5">
                <p className="text-[9px] text-accent-purple tracking-[0.2em] uppercase mb-1">Privacy</p>
                <p className="text-base font-bold text-accent-purple">PrivacyCash</p>
                <p className="text-[10px] text-[#666] mt-0.5">ZK shielded swaps</p>
              </div>
            </div>

            <div className="p-4 border border-[#222] mb-3">
              <p className="text-[9px] text-[#666] tracking-[0.2em] uppercase mb-2">Fee Structure</p>
              <div className="flex justify-between items-center">
                <div><p className="text-sm font-bold">Standard Swap</p><p className="text-[10px] text-[#666]">Non-custodial, instant settlement</p></div>
                <p className="text-xl font-bold">0.5%</p>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#222]">
                <div><p className="text-sm font-bold text-accent-purple">Shield Swap</p><p className="text-[10px] text-[#666]">Privacy pool + ZK withdrawal</p></div>
                <p className="text-xl font-bold text-accent-purple">0.75%</p>
              </div>
            </div>

            <div className="p-4 border border-[#222] mb-3">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[9px] text-[#666] tracking-[0.2em] uppercase">MEV Protection</p>
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              </div>
              <p className="text-sm font-bold">On by default</p>
              <p className="text-[10px] text-[#666] mt-0.5">Prevents sandwich attacks on large trades.</p>
            </div>

            <div className="p-4 border border-[#222]">
              <p className="text-[9px] text-[#666] tracking-[0.2em] uppercase mb-1">Your Custody</p>
              <p className="text-sm font-bold">Non-Custodial</p>
              <p className="text-[10px] text-[#666] mt-0.5">Your keys, your assets. Solis never holds your funds. All swaps execute directly from your wallet.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SwapLoading() {
  return <div className="min-h-screen bg-black text-white flex items-center justify-center"><p className="text-[#666] text-sm tracking-wider">Loading...</p></div>;
}

export default function SwapPage() {
  return <Suspense fallback={<SwapLoading />}><SwapPageContent /></Suspense>;
}
