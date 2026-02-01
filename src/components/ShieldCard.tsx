// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { 
  calculateShieldFee, 
  shieldSOL, 
  withdrawSOL, 
  getShieldedBalance,
  estimateWithdrawalOutput,
  type PrivateBalance 
} from "@/lib/privacycash";

type Mode = 'shield' | 'withdraw';

export default function ShieldCard() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [mode, setMode] = useState<Mode>('shield');
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [useNewWallet, setUseNewWallet] = useState(true);
  
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [privateBalance, setPrivateBalance] = useState<PrivateBalance>({ sol: 0, usdc: 0, usdt: 0 });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!publicKey || !connection) return;
    
    try {
      const balance = await connection.getBalance(publicKey);
      setWalletBalance(balance / LAMPORTS_PER_SOL);
      
      const shielded = await getShieldedBalance(publicKey);
      setPrivateBalance(shielded);
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 15000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  // Calculate fees and output
  const amountNum = parseFloat(amount) || 0;
  const amountLamports = Math.floor(amountNum * LAMPORTS_PER_SOL);
  
  const shieldFees = calculateShieldFee(amountLamports);
  const withdrawEstimate = estimateWithdrawalOutput(amountNum);

  // Handle percentage buttons
  const handlePercentage = (percent: number) => {
    const available = mode === 'shield' ? walletBalance : privateBalance.sol;
    const reserveSOL = mode === 'shield' ? 0.01 : 0; // Reserve for tx fees when shielding
    const maxAmount = Math.max(0, available - reserveSOL);
    const value = (maxAmount * percent) / 100;
    setAmount(value.toFixed(4));
  };

  // Handle shield
  const handleShield = async () => {
    if (!publicKey || !signTransaction || !amountNum) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await shieldSOL(
        connection,
        { publicKey, signTransaction },
        amountNum
      );

      if (result.success) {
        setSuccess(`Shielded ${result.amountShielded.toFixed(4)} SOL. Tx: ${result.txSignature?.slice(0, 8)}...`);
        setAmount("");
        fetchBalances();
      } else {
        setError(result.error || 'Shield failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Shield failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!publicKey || !signTransaction || !amountNum) return;
    
    const recipient = useNewWallet ? '' : recipientAddress; // Empty = generate new wallet
    if (!useNewWallet && !recipientAddress) {
      setError('Enter a recipient address or use a new wallet');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await withdrawSOL(
        connection,
        { publicKey, signTransaction },
        amountNum,
        recipient
      );

      if (result.success) {
        setSuccess(`Withdrew ${result.amountWithdrawn.toFixed(4)} SOL privately`);
        setAmount("");
        fetchBalances();
      } else {
        setError(result.error || 'Withdraw failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Withdraw failed');
    } finally {
      setLoading(false);
    }
  };

  // Validation
  const maxShield = Math.max(0, walletBalance - 0.01);
  const maxWithdraw = privateBalance.sol;
  const isValidAmount = amountNum > 0 && amountNum <= (mode === 'shield' ? maxShield : maxWithdraw);

  if (!connected) {
    return (
      <div className="border border-slate-800 rounded-lg p-6 bg-black/50 backdrop-blur-sm">
        <div className="text-center py-8">
          <div className="text-slate-400 mb-4">Connect wallet to shield your SOL</div>
          <button
            onClick={() => setVisible(true)}
            className="px-6 py-3 bg-white text-black rounded font-bold tracking-wider uppercase hover:bg-slate-100 transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-800 rounded-lg bg-black/50 backdrop-blur-sm overflow-hidden">
      {/* Mode Toggle */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setMode('shield')}
          className={`flex-1 py-3 text-sm tracking-wider uppercase transition-colors ${
            mode === 'shield'
              ? 'bg-slate-800 text-white font-bold'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Shield
        </button>
        <button
          onClick={() => setMode('withdraw')}
          className={`flex-1 py-3 text-sm tracking-wider uppercase transition-colors ${
            mode === 'withdraw'
              ? 'bg-slate-800 text-white font-bold'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Withdraw
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Balance Display */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 border border-slate-800 rounded bg-slate-900/30">
            <div className="text-slate-500 text-xs tracking-widest uppercase mb-1">Wallet</div>
            <div className="text-white font-bold">{walletBalance.toFixed(4)} SOL</div>
          </div>
          <div className="p-3 border border-slate-800 rounded bg-slate-900/30">
            <div className="text-slate-500 text-xs tracking-widest uppercase mb-1 flex items-center gap-1.5">
              Private
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="text-white font-bold">{privateBalance.sol.toFixed(4)} SOL</div>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-slate-500 text-xs tracking-widest uppercase mb-2 block">
            {mode === 'shield' ? 'Amount to Shield' : 'Amount to Withdraw'}
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-900/50 border border-slate-700 rounded px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-slate-500 transition-colors"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">SOL</span>
          </div>
          
          {/* Percentage Buttons */}
          <div className="flex gap-2 mt-2">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => handlePercentage(pct)}
                className="flex-1 py-1.5 text-xs text-slate-400 border border-slate-700 rounded hover:border-slate-500 hover:text-white transition-colors"
              >
                {pct === 100 ? 'MAX' : `${pct}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Withdraw Options */}
        {mode === 'withdraw' && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useNewWallet}
                onChange={(e) => setUseNewWallet(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-white focus:ring-0"
              />
              <span className="text-slate-400 text-sm">Withdraw to a new clean wallet</span>
            </label>
            
            {!useNewWallet && (
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Recipient address (Solana)"
                className="w-full bg-slate-900/50 border border-slate-700 rounded px-4 py-2 text-white text-sm focus:outline-none focus:border-slate-500 transition-colors"
              />
            )}
          </div>
        )}

        {/* Fee Breakdown */}
        {amountNum > 0 && (
          <div className="p-3 border border-slate-800 rounded bg-slate-900/30 space-y-2 text-sm">
            {mode === 'shield' ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Solis Fee (0.25%)</span>
                  <span className="text-slate-300">{(shieldFees.fee / LAMPORTS_PER_SOL).toFixed(6)} SOL</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-400">You Shield</span>
                  <span className="text-white font-bold">{(shieldFees.netAmount / LAMPORTS_PER_SOL).toFixed(4)} SOL</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Privacy Cash Fee</span>
                  <span className="text-slate-300">{withdrawEstimate.privacyCashFee.toFixed(6)} SOL</span>
                </div>
                <div className="text-slate-600 text-xs">{withdrawEstimate.feeBreakdown}</div>
                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-400">You Receive</span>
                  <span className="text-white font-bold">{withdrawEstimate.output.toFixed(4)} SOL</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 border border-red-500/30 rounded bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 border border-green-500/30 rounded bg-green-500/10 text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={mode === 'shield' ? handleShield : handleWithdraw}
          disabled={loading || !isValidAmount}
          className={`w-full py-3 rounded font-bold tracking-wider uppercase transition-all ${
            loading || !isValidAmount
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-white text-black hover:bg-slate-100'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : mode === 'shield' ? (
            'Shield SOL'
          ) : (
            'Withdraw Privately'
          )}
        </button>

        {/* Info Box */}
        <div className="p-3 border border-slate-800/50 rounded text-xs text-slate-500 leading-relaxed">
          {mode === 'shield' ? (
            <>
              <span className="text-slate-400">Shield</span> breaks the link between your wallet and future withdrawals using zero-knowledge proofs. 
              Withdraw anytime to any address — no one can trace it back.
            </>
          ) : (
            <>
              <span className="text-slate-400">Withdraw</span> to a clean wallet for maximum privacy. 
              The ZK proof ensures no one can link this withdrawal to your original deposit.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
