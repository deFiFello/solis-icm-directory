// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useBitcoinWallet } from '../contexts/BitcoinWalletProvider';
import useHotReserveBucketActions from '../hooks/zpl/useHotReserveBucketActions';
import useHotReserveBucketsByOwner from '../hooks/zpl/useHotReserveBucketsByOwner';
import { useNetworkConfig } from '../hooks/misc/useNetworkConfig';
import { CheckBucketResult } from '../types/misc';
import * as bitcoin from 'bitcoinjs-lib';
const ZBTC_MINT = 'zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg';

type BridgeStep = 'connect' | 'connect-btc' | 'generate' | 'deposit' | 'confirming' | 'complete';

interface DepositStatus {
  txId: string | null;
  confirmations: number;
  amount: number;
  status: 'pending' | 'confirming' | 'confirmed' | 'minted';
}

export function BridgeCard() {
  const { publicKey, connected: solanaConnected } = useWallet();
  const { 
    wallet: bitcoinWallet, 
    connected: btcConnected, 
    connectDerivedWallet,
    connecting: btcConnecting 
  } = useBitcoinWallet();
  
  const networkConfig = useNetworkConfig();
  const { data: hotReserveBuckets } = useHotReserveBucketsByOwner(publicKey);
  const { 
    createHotReserveBucket, 
    checkHotReserveBucketStatus,
    reactivateHotReserveBucket 
  } = useHotReserveBucketActions(bitcoinWallet);

  const [step, setStep] = useState<BridgeStep>('connect');
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(null);
  const [zbtcBalance, setZbtcBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Update step based on wallet connections
  useEffect(() => {
    if (!solanaConnected) {
      setStep('connect');
    } else if (!btcConnected) {
      setStep('connect-btc');
    } else if (!depositAddress) {
      setStep('generate');
    }
  }, [solanaConnected, btcConnected, depositAddress]);

  // Check for existing hot reserve bucket and get deposit address
  useEffect(() => {
    if (!hotReserveBuckets || hotReserveBuckets.length === 0) return;
    
    const targetBucket = hotReserveBuckets.find(
      (bucket) => bucket.reserveSetting.toBase58() === networkConfig.guardianSetting
    );
    
    if (targetBucket) {
      // Derive the taproot address from the bucket
      const taprootPubkey = Buffer.from(targetBucket.taprootXOnlyPublicKey);
      const { address } = bitcoin.payments.p2tr({
        pubkey: taprootPubkey,
        network: bitcoin.networks.bitcoin, // mainnet
      });
      
      if (address) {
        setDepositAddress(address);
        setStep('deposit');
      }
    }
  }, [hotReserveBuckets, networkConfig.guardianSetting]);

  // Monitor deposit status
  useEffect(() => {
    if (!depositAddress || step === 'generate' || step === 'connect' || step === 'connect-btc') return;

    const checkDeposit = async () => {
      try {
        const response = await fetch(
          `https://mempool.space/api/address/${depositAddress}/txs`
        );
        
        if (!response.ok) return;
        
        const txs = await response.json();
        
        if (txs.length === 0) {
          setDepositStatus({ txId: null, confirmations: 0, amount: 0, status: 'pending' });
          return;
        }

        const latestTx = txs[0];
        let confirmations = 0;
        if (latestTx.status.confirmed && latestTx.status.block_height) {
          const tipResponse = await fetch('https://mempool.space/api/blocks/tip/height');
          const currentHeight = await tipResponse.json();
          confirmations = currentHeight - latestTx.status.block_height + 1;
        }

        const amount = latestTx.vout
          .filter((out: any) => out.scriptpubkey_address === depositAddress)
          .reduce((sum: number, out: any) => sum + out.value, 0);

        let status: DepositStatus['status'] = 'pending';
        if (confirmations >= 6) {
          status = 'confirmed';
          setStep('complete');
        } else if (confirmations > 0) {
          status = 'confirming';
          setStep('confirming');
        }

        setDepositStatus({ txId: latestTx.txid, confirmations, amount, status });
      } catch (err) {
        console.error('Error checking deposit:', err);
      }
    };

    checkDeposit();
    const interval = setInterval(checkDeposit, 30000);
    return () => clearInterval(interval);
  }, [depositAddress, step]);

  // Connect Bitcoin wallet (derived from Solana)
  const handleConnectBitcoin = async () => {
    try {
      await connectDerivedWallet();
    } catch (err: any) {
      setError(err.message || 'Failed to connect Bitcoin wallet');
    }
  };

  // Generate deposit address
  const generateDepositAddress = useCallback(async () => {
    if (!publicKey || !bitcoinWallet) return;
    
    setLoading(true);
    setError(null);

    try {
      // Check if bucket already exists
      const bucketStatus = await checkHotReserveBucketStatus();
      
      if (bucketStatus?.status === CheckBucketResult.NotFound) {
        // Create new bucket
        await createHotReserveBucket();
      } else if (
        bucketStatus?.status === CheckBucketResult.Expired ||
        bucketStatus?.status === CheckBucketResult.Deactivated
      ) {
        // Reactivate existing bucket
        await reactivateHotReserveBucket();
      }
      
      // The useEffect watching hotReserveBuckets will update the deposit address
      
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Failed to generate deposit address');
    } finally {
      setLoading(false);
    }
  }, [publicKey, bitcoinWallet, checkHotReserveBucketStatus, createHotReserveBucket, reactivateHotReserveBucket]);

  const copyAddress = () => {
    if (depositAddress) {
      navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="card w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Bridge BTC → zBTC</h2>
        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
          FREE
        </span>
      </div>

      {/* zBTC Balance */}
      {solanaConnected && (
        <div className="bg-bg-tertiary rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-text-muted text-sm">Your zBTC Balance</span>
            <span className="text-white font-mono">{zbtcBalance.toFixed(8)} zBTC</span>
          </div>
        </div>
      )}

      {/* Step 1: Connect Solana Wallet */}
      {step === 'connect' && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🔗</div>
          <p className="text-text-secondary mb-4">
            Connect your Solana wallet to start bridging BTC
          </p>
        </div>
      )}

      {/* Step 2: Connect Bitcoin Wallet (derived) */}
      {step === 'connect-btc' && (
        <div className="text-center py-6">
          <div className="text-6xl mb-4">₿</div>
          <p className="text-text-secondary mb-6">
            Sign a message to derive your Bitcoin deposit address
          </p>
          
          <button
            onClick={handleConnectBitcoin}
            disabled={btcConnecting}
            className="btn-primary w-full"
          >
            {btcConnecting ? 'Signing...' : 'Connect Bitcoin Wallet'}
          </button>

          {error && (
            <p className="text-red-400 text-sm mt-4">{error}</p>
          )}
        </div>
      )}

      {/* Step 3: Generate Address */}
      {step === 'generate' && (
        <div className="text-center py-6">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-text-secondary mb-6">
            Create your unique Taproot deposit address
          </p>
          
          <button
            onClick={generateDepositAddress}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Creating...' : 'Generate Deposit Address'}
          </button>

          {error && (
            <p className="text-red-400 text-sm mt-4">{error}</p>
          )}
        </div>
      )}

      {/* Step 4: Deposit */}
      {(step === 'deposit' || step === 'confirming') && depositAddress && (
        <div className="space-y-4">
          <div className="bg-accent-btc/10 border border-accent-btc/30 rounded-lg p-4">
            <h3 className="text-accent-btc font-medium mb-2">📋 Send BTC</h3>
            <ol className="text-text-secondary text-sm space-y-1">
              <li>1. Copy the address below</li>
              <li>2. Send BTC from your wallet</li>
              <li>3. Wait ~60 min for confirmations</li>
            </ol>
          </div>

          <div className="bg-bg-tertiary rounded-lg p-4">
            <label className="text-text-muted text-xs block mb-2">Deposit Address</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-white text-xs break-all bg-bg-primary p-2 rounded font-mono">
                {depositAddress}
              </code>
              <button
                onClick={copyAddress}
                className="px-3 py-2 bg-accent-btc hover:bg-accent-btc/80 rounded text-white text-sm"
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg mx-auto w-fit">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(depositAddress)}`}
              alt="QR Code"
              className="w-48 h-48"
            />
          </div>

          {depositStatus?.txId && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Confirmations</span>
                <span className={depositStatus.confirmations >= 6 ? 'text-green-400' : 'text-yellow-400'}>
                  {depositStatus.confirmations} / 6
                </span>
              </div>
              <div className="w-full bg-bg-primary rounded-full h-2">
                <div 
                  className="bg-accent-btc h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (depositStatus.confirmations / 6) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Complete */}
      {step === 'complete' && (
        <div className="text-center py-6">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-white mb-4">Bridge Complete!</h3>
          <button
            onClick={() => {
              setDepositAddress(null);
              setDepositStatus(null);
              setStep('generate');
            }}
            className="btn-primary w-full"
          >
            Bridge More BTC
          </button>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-text-muted text-xs text-center">
          Powered by Zeus Network • Secured by Bitcoin
        </p>
      </div>
    </div>
  );
}

export default BridgeCard;