"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import Header from "@/components/Header";
import {
  getBirdeyeHistory,
  getBirdeye24hVolume,
  generateFallbackChart,
  calculateSolisScore,
  getTokenMetadata,
  getMarketData,
  getTopHolders,
  getRecentSwaps,
  type TimeframeType,
  type ChartDataPoint,
  type SolisScoreResult,
  type HolderData,
  type RecentSwap,
  SOLIS_CONFIG,
  BTC_MINTS,
} from "@/services";

const DEX_TOKEN_MINTS: Record<string, string> = {
  'orca': 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  'raydium': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  'meteora': 'METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m',
  'phoenix': 'PHXKu8HWBqJHLVbZnE6XqrH3fnDJFT6y5JLJPkArQjG',
  'lifinity': 'LFNTYraetVioAPnGJht4yNg2aUZFXR776cMeN9VMjXp',
  'whirlpool': 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
};

const KNOWN_HOLDERS: Record<string, {
  name: string;
  type: 'custody' | 'exchange' | 'protocol';
  logo: string;
}> = {
  // Add known custody/exchange/protocol addresses here
  // Will be populated as we identify them
};

// Function to identify entity based on context
function identifyHolder(address: string, rank: number, percentage: number, assetSymbol: string) {
  // Check known holders first
  if (KNOWN_HOLDERS[address]) {
    return KNOWN_HOLDERS[address];
  }
  
  // For cbBTC, top holder with high percentage is Coinbase Custody
  if (assetSymbol === 'cbBTC' && rank === 0 && percentage > 40) {
    return {
      name: 'Coinbase Custody',
      type: 'custody' as const,
      logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
    };
  }
  
  return null;
}

const ASSET_METADATA: Record<string, {
  security: {
    audits: Array<{ firm: string; date: string; link?: string }>;
    custody: string;
    features: string[];
  };
  peg: {
    explanation: string;
    mechanism: string[];
  };
  redemption: {
    overview: string;
    traditional: string;
    solisAdvantage: string;
  };
  resources: {
    website?: string;
    docs?: string;
    support?: string;
    explorer?: string;
  };
}> = {
  // BTC Wrappers
  'cbBTC': {
    security: {
      audits: [
        { firm: 'Trail of Bits', date: 'September 2024' }
      ],
      custody: 'Coinbase Institutional Custody',
      features: [
        'SOC 2 Type II certified custody',
        'Real-time proof of reserves',
        '$320M digital asset insurance policy',
        'Segregated cold storage'
      ]
    },
    peg: {
      explanation: 'For every 1 cbBTC on Solana, Coinbase holds 1 BTC in cold storage. Reserves are verified on-chain and audited regularly by third-party firms.',
      mechanism: [
        'Cryptographic proof of reserves',
        'Third-party attestations',
        'On-chain verification',
        'Quarterly security audits'
      ]
    },
    redemption: {
      overview: 'Traditional wrapped tokens like cbBTC require unwrapping back to native Bitcoin through the issuer.',
      traditional: 'To unwrap cbBTC, you must return the token to Coinbase, complete KYC verification, and wait 24-48 hours for BTC delivery to your Bitcoin address.',
      solisAdvantage: 'With Solis, swap cbBTC directly for other assets on Solana. Skip the wait, skip the KYC, trade instantly.'
    },
    resources: {
      website: 'https://www.coinbase.com/cbbtc',
      docs: 'https://docs.cdp.coinbase.com/coinbase-wrapped-btc/docs/welcome',
      support: 'https://help.coinbase.com/',
      explorer: 'https://www.coinbase.com/cbbtc/transparency'
    }
  },
  'WBTC': {
    security: {
      audits: [
        { firm: 'ChainSecurity', date: 'January 2019' },
        { firm: 'Neodyme (Wormhole)', date: '2023' }
      ],
      custody: 'BitGo Regulated Custody',
      features: [
        'Multi-jurisdictional custody model',
        'Monthly proof of reserves',
        'Transparent on-chain minting',
        'Bridged via Wormhole to Solana'
      ]
    },
    peg: {
      explanation: 'WBTC uses a multi-custodian model where BitGo holds Bitcoin reserves. Every WBTC token is backed 1:1 by BTC in BitGo custody. WBTC on Solana is bridged from Ethereum via Wormhole.',
      mechanism: [
        'Daily balance updates',
        'Monthly attestations',
        'Transparent minting records',
        'Cross-chain bridge verification'
      ]
    },
    redemption: {
      overview: 'WBTC requires bridging back to Ethereum, then unwrapping through a KYC-verified merchant.',
      traditional: 'To unwrap WBTC: bridge to Ethereum (1-2 hours), burn WBTC through merchant (KYC required), wait 1-3 business days for BTC delivery.',
      solisAdvantage: 'On Solis, swap WBTC instantly for any Solana asset. No bridging, no waiting, no merchant intermediaries.'
    },
    resources: {
      website: 'https://wbtc.network/',
      docs: 'https://wbtc.network/dashboard/order-book',
      explorer: 'https://wbtc.network/dashboard/transparency'
    }
  },
  'zBTC': {
    security: {
      audits: [
        { firm: 'OtterSec', date: '2024' }
      ],
      custody: 'Zeus Network MPC (Multi-Party Computation)',
      features: [
        'Decentralized 7-guardian network',
        'No single point of failure',
        'SPV proof validation on Solana',
        'Open-source protocol'
      ]
    },
    peg: {
      explanation: 'zBTC is backed 1:1 by Bitcoin locked in a decentralized MPC network operated by Zeus guardians. Unlike centralized wrapped tokens, no single entity controls the reserves.',
      mechanism: [
        'Multi-party computation',
        'Guardian consensus verification',
        'Decentralized reserve custody',
        'On-chain SPV proofs'
      ]
    },
    redemption: {
      overview: 'zBTC uses a decentralized bridge operated by Zeus Network guardians. No KYC required.',
      traditional: 'To unwrap zBTC: initiate burn on Solana, wait for guardian consensus (typically 20 minutes), receive BTC to your Bitcoin address.',
      solisAdvantage: 'Solis lets you swap zBTC instantly without touching the bridge. Trade directly on Solana DEXes with no waiting for guardian confirmations.'
    },
    resources: {
      website: 'https://zeusnetwork.xyz/',
      docs: 'https://docs.zeusnetwork.xyz/',
      explorer: 'https://explorer.zeusnetwork.xyz/'
    }
  },
  'tBTC': {
    security: {
      audits: [
        { firm: 'Trail of Bits', date: '2022' },
        { firm: 'Least Authority', date: '2023' }
      ],
      custody: 'Threshold Network (51-of-100 signers)',
      features: [
        'Threshold ECDSA cryptography',
        'Permissionless operator network',
        'Bi-weekly operator rotation',
        '$500K bug bounty program'
      ]
    },
    peg: {
      explanation: 'tBTC uses threshold cryptography with 51-of-100 signers required to move funds. Built after renBTC collapse to be truly decentralized and censorship-resistant.',
      mechanism: [
        'Threshold signature scheme',
        'Honest-majority security assumption',
        'Optimistic minting via guardians',
        'Direct BTC redemption'
      ]
    },
    redemption: {
      overview: 'tBTC supports direct redemption to native Bitcoin without intermediaries.',
      traditional: 'To unwrap tBTC: request redemption on-chain, wait for threshold signers to process (typically 1-3 hours), receive BTC directly.',
      solisAdvantage: 'Skip the redemption queue. Swap tBTC instantly on Solis for any Solana asset.'
    },
    resources: {
      website: 'https://threshold.network/',
      docs: 'https://docs.threshold.network/',
      explorer: 'https://dashboard.threshold.network/'
    }
  },
  'xBTC': {
    security: {
      audits: [
        { firm: 'OKX Security', date: 'May 2025' }
      ],
      custody: 'OKX Custody',
      features: [
        'Real-time proof of reserves',
        'OKX institutional custody',
        'Multi-chain native deployment',
        'OKX Web3 wallet integration'
      ]
    },
    peg: {
      explanation: 'xBTC is backed 1:1 by Bitcoin held in OKX custody with real-time proof of reserves. Natively deployed on Solana (not bridged).',
      mechanism: [
        'Real-time reserve attestations',
        'Native multi-chain minting',
        'OKX custody infrastructure',
        'On-chain verification'
      ]
    },
    redemption: {
      overview: 'xBTC can be redeemed directly through OKX.',
      traditional: 'To unwrap xBTC: return to OKX, complete verification, receive BTC within 24 hours.',
      solisAdvantage: 'Trade xBTC instantly on Solis. No exchange withdrawal queues, no waiting periods.'
    },
    resources: {
      website: 'https://www.okx.com/',
      docs: 'https://www.okx.com/web3',
      explorer: 'https://www.okx.com/proof-of-reserves'
    }
  },
  'LBTC': {
    security: {
      audits: [
        { firm: 'Multiple firms', date: '2024' }
      ],
      custody: '14-Institution Security Consortium',
      features: [
        'Galaxy, Kraken, Figment, Kiln, P2P in consortium',
        'Non-rebasing design for DeFi compatibility',
        'Babylon staking integration',
        'LayerZero cross-chain bridging'
      ]
    },
    peg: {
      explanation: 'LBTC is backed 1:1 by Bitcoin staked via Babylon protocol. Custody distributed across 14 institutional validators. Earns ~1% APY in BTC while remaining liquid.',
      mechanism: [
        'Babylon Bitcoin staking',
        'Consortium custody model',
        'Yield accrual mechanism',
        'Cross-chain via LayerZero'
      ]
    },
    redemption: {
      overview: 'LBTC can be unstaked and redeemed for native BTC.',
      traditional: 'To unwrap LBTC: initiate unstaking, wait for Babylon unbonding period, receive BTC to your address.',
      solisAdvantage: 'Keep earning yield while trading. Swap LBTC instantly on Solis without unstaking or waiting.'
    },
    resources: {
      website: 'https://lombard.finance/',
      docs: 'https://docs.lombard.finance/',
      explorer: 'https://lombard.finance/dashboard'
    }
  },
  // Base Layer
  'SOL': {
    security: {
      audits: [
        { firm: 'Kudelski Security', date: 'Ongoing' },
        { firm: 'Neodyme', date: 'Ongoing' }
      ],
      custody: 'Native Layer 1 Token',
      features: [
        'Proof of Stake consensus',
        'Firedancer validator client (Jump Crypto)',
        'Sub-second finality',
        'Native to Solana blockchain'
      ]
    },
    peg: {
      explanation: 'SOL is the native token of the Solana blockchain. Not pegged to any external asset — its value is determined by network utility and market demand.',
      mechanism: [
        'Native blockchain token',
        'Used for transaction fees',
        'Staking for network security',
        'Governance participation'
      ]
    },
    redemption: {
      overview: 'SOL is native to Solana — no unwrapping or bridging required.',
      traditional: 'SOL can be transferred to any Solana wallet or exchange instantly.',
      solisAdvantage: 'Trade SOL for any asset on Solis with instant execution and minimal fees.'
    },
    resources: {
      website: 'https://solana.com/',
      docs: 'https://docs.solana.com/',
      explorer: 'https://solscan.io/'
    }
  },
  // Stablecoins
  'USDC': {
    security: {
      audits: [
        { firm: 'Grant Thornton', date: 'Monthly attestations' },
        { firm: 'Deloitte', date: 'Annual audit' }
      ],
      custody: 'Circle (US regulated)',
      features: [
        'Monthly reserve attestations',
        '100% backed by USD + Treasuries',
        'Applied for national trust bank charter',
        'GENIUS Act compliant'
      ]
    },
    peg: {
      explanation: 'USDC is backed 100% by US dollars and short-term Treasury securities. Circle publishes monthly attestations from Grant Thornton verifying reserves.',
      mechanism: [
        'Full reserve backing',
        'Monthly third-party attestations',
        'Real-time redemption at $1.00',
        'Regulated US entity'
      ]
    },
    redemption: {
      overview: 'USDC can be redeemed 1:1 for USD through Circle.',
      traditional: 'Redeem via Circle: KYC required, typically processed same business day for verified accounts.',
      solisAdvantage: 'Swap USDC instantly on Solis for any asset. No redemption process, no waiting for bank transfers.'
    },
    resources: {
      website: 'https://www.circle.com/usdc',
      docs: 'https://developers.circle.com/',
      explorer: 'https://www.circle.com/usdc#transparency'
    }
  },
  'USDT': {
    security: {
      audits: [
        { firm: 'BDO Italia', date: 'Quarterly attestations' }
      ],
      custody: 'Tether Limited',
      features: [
        'Quarterly reserve reports',
        'Backed by cash and Treasuries',
        'Largest stablecoin by market cap',
        'Global liquidity infrastructure'
      ]
    },
    peg: {
      explanation: 'USDT is backed by cash, cash equivalents, and US Treasury securities. Tether publishes quarterly reserve reports. The most liquid stablecoin globally.',
      mechanism: [
        'Reserve backing',
        'Quarterly attestations',
        'Redemption via Tether',
        'Multi-chain deployment'
      ]
    },
    redemption: {
      overview: 'USDT can be redeemed through Tether for verified users.',
      traditional: 'Redeem via Tether: verification required, minimum $100K redemption, processed in 1-3 business days.',
      solisAdvantage: 'Trade USDT instantly on Solis. No minimums, no verification delays, no bank wire waits.'
    },
    resources: {
      website: 'https://tether.to/',
      docs: 'https://tether.to/knowledge-base/',
      explorer: 'https://tether.to/transparency/'
    }
  },
  'PYUSD': {
    security: {
      audits: [
        { firm: 'Paxos (NYDFS regulated)', date: 'Monthly attestations' }
      ],
      custody: 'Paxos Trust Company',
      features: [
        'NYDFS regulated issuer',
        '100% backed reserves',
        'Solana token extensions enabled',
        'PayPal/Venmo redemption'
      ]
    },
    peg: {
      explanation: 'PYUSD is issued by Paxos Trust Company under NYDFS regulation. 100% backed by USD deposits and Treasuries. Redeemable at $1.00 through PayPal or Venmo.',
      mechanism: [
        'Full reserve backing',
        'NYDFS regulatory oversight',
        'Monthly attestations',
        'PayPal ecosystem integration'
      ]
    },
    redemption: {
      overview: 'PYUSD can be redeemed through PayPal or Venmo at $1.00.',
      traditional: 'Redeem via PayPal: instant to PayPal balance, then transfer to bank (1-3 days).',
      solisAdvantage: 'Swap PYUSD instantly on Solis. Trade 24/7 without waiting for PayPal transfers.'
    },
    resources: {
      website: 'https://www.paypal.com/pyusd',
      docs: 'https://developer.paypal.com/',
      explorer: 'https://paxos.com/pyusd/'
    }
  },
  'USD1': {
    security: {
      audits: [
        { firm: 'BitGo custody verification', date: '2025' }
      ],
      custody: 'BitGo',
      features: [
        '100% Treasury-backed',
        'BitGo institutional custody',
        'Applied for OCC trust charter',
        'Multi-chain deployment'
      ]
    },
    peg: {
      explanation: 'USD1 is backed 100% by US Treasuries and dollar deposits, custodied by BitGo. Applied for national trust bank charter from the OCC.',
      mechanism: [
        'Treasury-backed reserves',
        'BitGo custody',
        'OCC charter application',
        'Multi-chain native'
      ]
    },
    redemption: {
      overview: 'USD1 can be redeemed through World Liberty Financial.',
      traditional: 'Redeem via issuer: verification required, processed per issuer terms.',
      solisAdvantage: 'Trade USD1 instantly on Solis. No issuer redemption process, no delays.'
    },
    resources: {
      website: 'https://worldlibertyfinancial.com/',
      docs: 'https://worldlibertyfinancial.com/',
      explorer: 'https://solscan.io/token/USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'
    }
  }
};

const ASSET_CONTEXT: Record<string, {
  description: string;
  useCase: string;
  custodyModel: string;
  launched: string;
}> = {
  'cbBTC': {
    description: 'Coinbase launched cbBTC in September 2024 as a direct response to custody concerns around WBTC. Backed 1:1 by Bitcoin in Coinbase cold storage with real-time proof of reserves. Hit $4.7B market cap and became the 3rd largest wrapped BTC within 7 days of launch. Integrated with Jupiter, Kamino, Drift, and Meteora on day one of Solana deployment.',
    useCase: 'Institutional-grade Bitcoin exposure on Solana with exchange backing',
    custodyModel: 'Centralized (Coinbase Institutional Custody)',
    launched: 'September 2024 (Ethereum/Base), November 2024 (Solana)'
  },
  'WBTC': {
    description: 'The original wrapped Bitcoin, launched January 2019. WBTC pioneered the concept of tokenized BTC and remains the largest by market cap at $13.6B. Custody managed by BitGo with 2-of-3 multisig now shared across multiple jurisdictions. Bridged to Solana via Wormhole. Despite being the oldest wrapper, WBTC maintains the deepest liquidity across DeFi protocols.',
    useCase: 'Cross-chain Bitcoin liquidity with the deepest DeFi integrations',
    custodyModel: 'Centralized (BitGo multi-jurisdictional custody)',
    launched: 'January 2019 (Ethereum), 2021 (Solana via Wormhole)'
  },
  'zBTC': {
    description: 'Zeus Network launched zBTC in December 2024 as the first permissionless wrapped BTC on Solana. Built by CEO Justin Wang with backing from Animoca Ventures. Uses a decentralized network of 7 Guardian validators running Multi-Party Computation — no single entity controls the keys. Over $250M processed with 40+ protocol integrations. No KYC required for minting or redemption.',
    useCase: 'Permissionless Bitcoin bridge with decentralized custody',
    custodyModel: 'Decentralized (Zeus Guardian MPC Network)',
    launched: 'December 2024'
  },
  'tBTC': {
    description: 'Built by Thesis after the collapse of renBTC (Alameda/FTX). tBTC v2 launched January 2023 using threshold cryptography with a 51-of-100 signer model — requires majority consensus to move funds. The only decentralized, permissionless BTC bridge that has scaled to multiple chains. Backed by Keep Network and NuCypher merger into Threshold Network. $500K bug bounty program.',
    useCase: 'Trust-minimized Bitcoin bridge with threshold security',
    custodyModel: 'Decentralized (51-of-100 Threshold Signers)',
    launched: 'May 2020 (v1), January 2023 (v2)'
  },
  'xBTC': {
    description: 'OKX launched xBTC in May 2025, the newest wrapped BTC on Solana. Backed by OKX custody with real-time proof of reserves. Launched simultaneously on Solana, Sui, and Aptos with $250K+ in launch incentives via Kamino and Orca. Benefits from OKX Web3 wallet integration and the exchange\'s 10x Solana wallet growth in 2024.',
    useCase: 'Exchange-backed Bitcoin with multi-chain native deployment',
    custodyModel: 'Centralized (OKX Custody with Proof of Reserves)',
    launched: 'May 2025'
  },
  'LBTC': {
    description: 'Lombard Finance introduced LBTC in August 2024 as the first yield-bearing Bitcoin at scale. Founded by Jacob Phillips (ex-Polychain/Coinbase) with $17M seed from Polychain, Franklin Templeton, Binance Labs, and OKX Ventures. Custody secured by a consortium of 14 institutions including Galaxy, Kraken, and Figment. Reached $1B TVL in 92 days — the fastest-growing yield token in crypto.',
    useCase: 'Yield-bearing Bitcoin via Babylon staking (~1% APY)',
    custodyModel: 'Decentralized (14-Institution Security Consortium)',
    launched: 'August 2024 (Ethereum), August 2025 (Solana)'
  },
  'SOL': {
    description: 'Solana launched in March 2020, founded by Anatoly Yakovenko and Raj Gokal (ex-Qualcomm). Purpose-built for speed: 400ms blocks, sub-cent fees, 65K+ TPS theoretical capacity. Powers the entire Solana DeFi ecosystem including Jupiter, Raydium, Marinade, and Jito. Institutional adoption from PayPal, Visa, Stripe, and Worldpay. Network stability significantly improved since 2022.',
    useCase: 'Native gas token and base layer for Solana ecosystem',
    custodyModel: 'Native Layer 1 (Proof of Stake)',
    launched: 'March 2020'
  },
  'USDC': {
    description: 'Circle launched USDC in September 2018 as the transparent alternative to Tether. 100% backed by USD and short-term Treasuries with monthly attestations from Grant Thornton. Applied for national trust bank charter and positioned for GENIUS Act compliance. $71B+ market cap makes it the #2 stablecoin. Dominates Solana with $9B of the chain\'s $14B total stablecoin supply.',
    useCase: 'Regulated stablecoin for payments and DeFi',
    custodyModel: 'Centralized (Circle with regulated reserves)',
    launched: 'September 2018'
  },
  'USDT': {
    description: 'Tether launched in 2014 as the first stablecoin, now the largest at $167B+ market cap. Issued by Tether Limited (CEO Paolo Ardoino). Reserves backed by cash, cash equivalents, and US Treasuries. The de facto global trading pair — essential infrastructure for crypto liquidity worldwide. Reserve transparency has improved significantly since early controversies.',
    useCase: 'Global trading pair and liquidity backbone',
    custodyModel: 'Centralized (Tether Limited)',
    launched: '2014'
  },
  'PYUSD': {
    description: 'PayPal launched PYUSD in August 2023, issued by Paxos Trust Company under NYDFS regulation. Expanded to Solana in May 2024. 100% backed by USD deposits and Treasuries, fully redeemable at $1.00 via PayPal or Venmo. First stablecoin using Solana token extensions for compliance features. Access to PayPal\'s 400M+ users and 30M+ merchants.',
    useCase: 'Consumer payments stablecoin with PayPal ecosystem access',
    custodyModel: 'Centralized (Paxos Trust, NYDFS regulated)',
    launched: 'August 2023 (Ethereum), May 2024 (Solana)'
  },
  'USD1': {
    description: 'World Liberty Financial launched USD1 in March 2025. 100% backed by US Treasuries and dollar deposits, custodied by BitGo. Raised $550M in token sales. Applied for national trust bank charter (OCC). Reached $5B+ market cap in under a year, now the #5 stablecoin. Live on Ethereum, Solana, BNB Chain, Tron, and Aptos. Major holders include MGX sovereign fund.',
    useCase: 'Treasury-backed stablecoin with institutional adoption',
    custodyModel: 'Centralized (BitGo custody)',
    launched: 'March 2025'
  }
};

function MetricTooltip({ 
  label, 
  value, 
  sublabel, 
  description,
  valueColor = 'text-white'
}: {
  label: string;
  value: string;
  sublabel?: string;
  description: string;
  valueColor?: string;
}) {
  return (
    <div className="border border-slate-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-slate-500 text-xs tracking-widest uppercase">
          {label}
        </span>
        <div className="relative group">
          <span className="text-slate-600 text-xs cursor-help">?</span>
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-3 bg-slate-900 border border-slate-700 text-xs text-slate-300 z-50 whitespace-normal">
            {description}
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-700" />
          </div>
        </div>
      </div>
      <div className={`${valueColor} font-bold text-2xl mb-1`}>
        {value}
      </div>
      {sublabel && (
        <div className="text-slate-500 text-xs uppercase tracking-wider">
          {sublabel}
        </div>
      )}
    </div>
  );
}

const ASSET_DATA: Record<string, {
  symbol: string;
  name: string;
  custody: string;
  custodyType: "centralized" | "decentralized" | "native";
  description: string;
  website: string;
  explorer: string;
  mint: string;
  decimals: number;
}> = {
  // BTC Wrappers
  cbbtc: {
    symbol: "cbBTC", name: "Coinbase Wrapped BTC", custody: "Coinbase", custodyType: "centralized",
    description: "Launched September 2024. Backed 1:1 by Bitcoin in Coinbase cold storage with real-time proof of reserves. $320M digital asset insurance. SOC 2 Type II certified custody. Reached $4.7B market cap within 7 days of launch.",
    website: "https://coinbase.com/cbbtc", explorer: "https://solscan.io/token/cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
    mint: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij", decimals: 8,
  },
  wbtc: {
    symbol: "WBTC", name: "Wrapped Bitcoin (Wormhole)", custody: "BitGo", custodyType: "centralized",
    description: "The original wrapped Bitcoin since January 2019. $13.6B market cap — largest by TVL. Custody by BitGo with 2-of-3 multisig across multiple jurisdictions. Bridged to Solana via Wormhole. Deepest DeFi liquidity of any BTC wrapper.",
    website: "https://wbtc.network", explorer: "https://solscan.io/token/3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
    mint: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh", decimals: 8,
  },
  zbtc: {
    symbol: "zBTC", name: "Zeus Network BTC", custody: "Zeus Guardians", custodyType: "decentralized",
    description: "First permissionless wrapped BTC on Solana. Launched December 2024 by Zeus Network. 7 Guardian validators running MPC — no single point of failure. $250M+ processed, 40+ protocol integrations. No KYC required.",
    website: "https://zeusnetwork.xyz", explorer: "https://solscan.io/token/zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg",
    mint: "zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg", decimals: 8,
  },
  tbtc: {
    symbol: "tBTC", name: "Threshold BTC", custody: "Threshold Network", custodyType: "decentralized",
    description: "Built after renBTC collapse. Uses 51-of-100 threshold signer model — requires majority consensus to move funds. Backed by Keep Network and NuCypher merger. $500K bug bounty. Live on 6+ chains including Solana.",
    website: "https://threshold.network", explorer: "https://solscan.io/token/6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU",
    mint: "6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU", decimals: 8,
  },
  xbtc: {
    symbol: "xBTC", name: "OKX Wrapped BTC", custody: "OKX", custodyType: "centralized",
    description: "Launched May 2025 — newest BTC wrapper on Solana. Backed by OKX custody with real-time proof of reserves. Native deployment on Solana, Sui, and Aptos simultaneously. $250K+ launch incentives via Kamino/Orca.",
    website: "https://okx.com", explorer: "https://solscan.io/token/CtzPWv73Sn1dMGVU3ZtLv9yWSyUAanBni19YWDaznnkn",
    mint: "CtzPWv73Sn1dMGVU3ZtLv9yWSyUAanBni19YWDaznnkn", decimals: 8,
  },
  lbtc: {
    symbol: "LBTC", name: "Lombard Staked BTC", custody: "Security Consortium", custodyType: "decentralized",
    description: "First yield-bearing BTC at scale. Earns ~1% APY via Babylon staking while usable in DeFi. $17M seed from Polychain, Franklin Templeton, Binance Labs. 14-institution custody consortium. $1B TVL in 92 days.",
    website: "https://lombard.finance", explorer: "https://solscan.io/token/LBTCgU4b3wsFKsPwBn1rRZDx5DoFutM6RPiEt1TPDsY",
    mint: "LBTCgU4b3wsFKsPwBn1rRZDx5DoFutM6RPiEt1TPDsY", decimals: 8,
  },
  // Base Layer
  sol: {
    symbol: "SOL", name: "Solana", custody: "Native", custodyType: "native",
    description: "Solana's native token. Founded by Anatoly Yakovenko (ex-Qualcomm). 400ms blocks, sub-cent fees, 65K+ TPS. Powers Jupiter, Raydium, Marinade, Jito. Institutional adoption from PayPal, Visa, Stripe, Worldpay.",
    website: "https://solana.com", explorer: "https://solscan.io/token/So11111111111111111111111111111111111111112",
    mint: "So11111111111111111111111111111111111111112", decimals: 9,
  },
  // Stablecoins
  usdc: {
    symbol: "USDC", name: "USD Coin", custody: "Circle", custodyType: "centralized",
    description: "Launched 2018 by Circle. 100% backed by USD and short-term Treasuries. Monthly attestations by Grant Thornton. $71B+ market cap (#2 stablecoin). Dominates Solana with $9B of $14B total stablecoin supply.",
    website: "https://circle.com/usdc", explorer: "https://solscan.io/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6,
  },
  usdt: {
    symbol: "USDT", name: "Tether USD", custody: "Tether Limited", custodyType: "centralized",
    description: "The first stablecoin (2014). $167B+ market cap — largest by far. Backed by cash, cash equivalents, and US Treasuries. The de facto global trading pair. Essential liquidity infrastructure for crypto markets worldwide.",
    website: "https://tether.to", explorer: "https://solscan.io/token/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6,
  },
  pyusd: {
    symbol: "PYUSD", name: "PayPal USD", custody: "Paxos Trust", custodyType: "centralized",
    description: "PayPal's stablecoin, issued by Paxos under NYDFS regulation. 100% backed, fully redeemable at $1.00 via PayPal/Venmo. First stablecoin using Solana token extensions. Access to 400M+ PayPal users, 30M+ merchants.",
    website: "https://paypal.com/pyusd", explorer: "https://solscan.io/token/2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
    mint: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", decimals: 6,
  },
  usd1: {
    symbol: "USD1", name: "World Liberty Financial USD", custody: "BitGo", custodyType: "centralized",
    description: "Launched March 2025 by World Liberty Financial. 100% backed by US Treasuries and dollar deposits. BitGo custody. $5B+ market cap in under a year (#5 stablecoin). Live on Ethereum, Solana, BNB Chain, Tron, Aptos.",
    website: "https://worldlibertyfinancial.com", explorer: "https://solscan.io/token/USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB",
    mint: "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB", decimals: 6,
  },
  cash: {
    symbol: "CASH", name: "CASH", custody: "Bridge", custodyType: "centralized",
    description: "Stablecoin by Bridge protocol (acquired by Stripe for $1.1B). Built for instant cross-chain transfers and payments. Native Solana deployment with deep DEX liquidity. Used for high-volume merchant settlements.",
    website: "https://bridge.xyz", explorer: "https://solscan.io/token/CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH",
    mint: "CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH", decimals: 6,
  },
  hyusd: {
    symbol: "hyUSD", name: "Hybrid USD", custody: "Reserve Protocol", custodyType: "decentralized",
    description: "Decentralized stablecoin built on Reserve Protocol. Backed by a diversified basket of yield-bearing assets. Autonomous rebalancing via smart contracts — no centralized issuer. Designed for DeFi-native yield generation.",
    website: "https://reserve.org", explorer: "https://solscan.io/token/5YMkXAYccHSGnHn9nob9xEvv6Pvka9DZWH7nTbotTu9E",
    mint: "5YMkXAYccHSGnHn9nob9xEvv6Pvka9DZWH7nTbotTu9E", decimals: 6,
  },
};

function PriceChart({ data, positive, loading }: { data: ChartDataPoint[]; positive: boolean; loading: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ price: number; time: Date; idx: number } | null>(null);

  const geo = useMemo(() => {
    if (data.length === 0) return null;
    const prices = data.map(d => d.price);
    const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 1;
    return { min, max, range };
  }, [data]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !geo || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const idx = Math.round(((e.clientX - rect.left) / rect.width - 0.075) / 0.9 * (data.length - 1));
    if (idx >= 0 && idx < data.length) setHover({ price: data[idx].price, time: data[idx].time, idx });
  }, [data, geo]);

  if (data.length === 0 || !geo) return <div className="h-[200px] bg-slate-900/50 rounded animate-pulse" />;

  const { min, range } = geo;
  const pts = data.map((d, i) => `${60 + (i / (data.length - 1)) * 720},${20 + (1 - (d.price - min) / range) * 160}`).join(' ');
  const color = positive ? "#22c55e" : "#ef4444";

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox="0 0 800 200" className={`w-full h-[200px] cursor-crosshair ${loading ? 'opacity-50' : ''}`} onMouseMove={handleMouseMove} onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((p, i) => {
          const y = 20 + (1 - p) * 160, val = min + range * p;
          return <g key={i}><line x1="60" y1={y} x2="780" y2={y} stroke="#1e293b" /><text x="55" y={y + 4} textAnchor="end" className="fill-slate-600 text-[10px]">${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}</text></g>;
        })}
        <polygon points={`60,180 ${pts} 780,180`} fill={positive ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)"} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
        {hover && <>
          <line x1={60 + (hover.idx / (data.length - 1)) * 720} y1="20" x2={60 + (hover.idx / (data.length - 1)) * 720} y2="180" stroke="#475569" strokeDasharray="4,4" />
          <circle cx={60 + (hover.idx / (data.length - 1)) * 720} cy={20 + (1 - (hover.price - min) / range) * 160} r="5" fill={color} stroke="#fff" strokeWidth="2" />
        </>}
        {!hover && <circle cx="780" cy={20 + (1 - (data[data.length - 1].price - min) / range) * 160} r="4" fill={color} />}
      </svg>
      {hover && (
        <div className="absolute bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm shadow-lg pointer-events-none" style={{ left: Math.min(60 + (hover.idx / (data.length - 1)) * 720 * 0.9, 600), top: 10 }}>
          <div className="text-white font-bold">${hover.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-slate-400 text-xs">{hover.time.toLocaleDateString()} {hover.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      )}
    </div>
  );
}

export default function AssetPage() {
  const params = useParams();
  const lookupKey = (params.symbol as string || "zbtc").toLowerCase();
  const asset = ASSET_DATA[lookupKey] || ASSET_DATA["zbtc"];
  
  // Smart default price based on asset type
  const getDefaultPrice = () => {
    const stablecoins = ['usdc', 'usdt', 'pyusd', 'usd1', 'cash', 'hyusd'];
    if (stablecoins.includes(lookupKey)) return 1.00;
    if (lookupKey === 'sol') return 200; // Reasonable SOL default
    return 100000; // BTC wrappers default
  };

  const [activeTab, setActiveTab] = useState<'markets' | 'holders' | 'history' | 'metadata'>('markets');
  const [timeframe, setTimeframe] = useState<TimeframeType>('1W');
  
  const [price, setPrice] = useState<number>(getDefaultPrice());
  const [change24h, setChange24h] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [tokenSupply, setTokenSupply] = useState<number | null>(null);
  const [volume24h, setVolume24h] = useState<number>(0);
  const [liquidity, setLiquidity] = useState<number>(0);
  const [marketPairs, setMarketPairs] = useState<any[]>([]);
  const [totalLiquidity, setTotalLiquidity] = useState<number>(0);
  const [totalVolume, setTotalVolume] = useState<number>(0);
  const [dexLogos, setDexLogos] = useState<Record<string, string>>({});
  const [showAllPools, setShowAllPools] = useState(false);
  const [solisScore, setSolisScore] = useState<SolisScoreResult | null>(null);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [holders, setHolders] = useState<HolderData[]>([]);
  const [topHolderPct, setTopHolderPct] = useState<number>(0);
  const [recentSwaps, setRecentSwaps] = useState<RecentSwap[]>([]);
  const [loadingSwaps, setLoadingSwaps] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logoUri, setLogoUri] = useState<string>("");
  const [tokenAuthority, setTokenAuthority] = useState<string>("");
  const [freezeAuthority, setFreezeAuthority] = useState<string>("");

  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  // Fetch price, volume, liquidity from DexScreener
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const data = await getMarketData(asset.mint);
        if (data) {
          let fetchedPrice = parseFloat(data.price || '0');
          
          // Stablecoin price sanity check - should be ~$1
          const stablecoins = ['USDC', 'USDT', 'PYUSD', 'USD1', 'CASH', 'hyUSD'];
          if (stablecoins.includes(asset.symbol)) {
            // If price is wildly off from $1 (>20% deviation), use $1.00
            if (fetchedPrice < 0.80 || fetchedPrice > 1.20) {
              console.warn(`[Solis] ${asset.symbol} price ${fetchedPrice} looks wrong, defaulting to $1.00`);
              fetchedPrice = 1.00;
            }
          }
          
          setPrice(fetchedPrice);
          setChange24h(data.priceChange24h || 0);
          setVolume24h(data.volume24h || 0);
          setLiquidity(data.liquidity || 0);
          setMarketPairs(data.allPairs || []);
          setTotalLiquidity(data.totalLiquidity || 0);
          setTotalVolume(data.totalVolume || 0);
        }
      } catch (error) {
        console.error('[Solis] Market data fetch failed:', error);
      }
    };
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, [asset.mint]);

  // Fetch logo from Helius
  useEffect(() => {
    getTokenMetadata(asset.mint)
      .then(metadata => {
        if (metadata?.logoURI) {
          setLogoUri(metadata.logoURI);
        }
      })
      .catch(() => {});
  }, [asset.mint]);

  // Fetch DEX logos
  useEffect(() => {
    const fetchDexLogos = async () => {
      const logos: Record<string, string> = {};
      const uniqueDexIds = [...new Set(marketPairs.map(p => p.dex.toLowerCase()))];
      
      await Promise.all(
        uniqueDexIds.map(async (dexId) => {
          const mint = DEX_TOKEN_MINTS[dexId];
          if (mint) {
            try {
              const metadata = await getTokenMetadata(mint);
              if (metadata?.logoURI) {
                logos[dexId] = metadata.logoURI;
              }
            } catch (error) {
              console.log(`[Solis] Could not fetch logo for ${dexId}`);
            }
          }
        })
      );
      
      setDexLogos(logos);
    };
    
    if (marketPairs.length > 0) {
      fetchDexLogos();
    }
  }, [marketPairs]);

  // Fetch recent swaps when HISTORY tab is active
  useEffect(() => {
    if (activeTab === 'history' && price > 0 && recentSwaps.length === 0 && !loadingSwaps) {
      setLoadingSwaps(true);
      getRecentSwaps(asset.mint, price, 5) // Reduced to 5 to avoid rate limits
        .then(swaps => {
          setRecentSwaps(swaps);
          setLoadingSwaps(false);
        })
        .catch(error => {
          console.error('[Solis] Failed to load recent swaps:', error);
          setLoadingSwaps(false);
        });
    }
  }, [activeTab, price, asset.mint]);

  // Fetch supply and token authority from Helius
  useEffect(() => {
    Promise.all([
      fetch(SOLIS_CONFIG.HELIUS_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenSupply', params: [asset.mint] }),
      }).then(r => r.json()),
      fetch(SOLIS_CONFIG.HELIUS_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'getAccountInfo', params: [asset.mint, { encoding: 'jsonParsed' }] }),
      }).then(r => r.json())
    ]).then(([supplyData, accountData]) => {
      if (supplyData.result?.value) {
        setTokenSupply(parseFloat(supplyData.result.value.amount) / Math.pow(10, supplyData.result.value.decimals || 8));
      }
      if (accountData.result?.value?.data?.parsed?.info) {
        const info = accountData.result.value.data.parsed.info;
        setTokenAuthority(info.mintAuthority || 'None');
        setFreezeAuthority(info.freezeAuthority || 'None');
      }
    }).catch(() => {});
  }, [asset.mint]);

  // Fetch top holders
  useEffect(() => {
    getTopHolders(asset.mint)
      .then(result => {
        setTopHolderPct(result.topHolderConcentration);
        setHolders(result.holders.slice(0, 10));
      })
      .catch(() => {});
  }, [asset.mint]);

  // Calculate Solis Score (only for BTC wrappers)
  useEffect(() => {
    // Solis Score is only applicable to BTC wrappers
    const btcWrappers = ['cbBTC', 'WBTC', 'zBTC', 'tBTC', 'xBTC', 'LBTC'];
    if (!btcWrappers.includes(asset.symbol)) {
      // Skip score calculation for non-BTC assets
      return;
    }
    
    calculateSolisScore(asset.symbol)
      .then(result => {
        setSolisScore(result);
      })
      .catch(error => {
        console.error('[Solis] Score calculation failed:', error);
      });
  }, [asset.symbol]);

  // Fetch chart data
  useEffect(() => {
    setChartLoading(true);
    getBirdeyeHistory(asset.mint, timeframe)
      .then(data => {
        setChartData(data);
        setChartLoading(false);
      })
      .catch(() => {
        setChartData(generateFallbackChart(timeframe, price));
        setChartLoading(false);
      });
  }, [timeframe, asset.mint, price]);

  const copyMint = () => { navigator.clipboard.writeText(asset.mint); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const copyAddress = (addr: string) => { navigator.clipboard.writeText(addr); };
  const fmt = (p: number) => `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const fmtSupply = (s: number | null) => s === null ? "--" : s >= 1000 ? s.toLocaleString(undefined, { maximumFractionDigits: 0 }) : s.toFixed(2);
  const fmtTVL = (s: number | null, p: number) => {
    if (s === null) return "--";
    const tvl = s * p;
    return tvl >= 1e9 ? `$${(tvl / 1e9).toFixed(2)}B` : tvl >= 1e6 ? `$${(tvl / 1e6).toFixed(2)}M` : tvl >= 1e3 ? `$${(tvl / 1e3).toFixed(0)}K` : `$${tvl.toFixed(0)}`;
  };
  const fmtVolume = (v: number) => {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return v > 0 ? `$${v.toFixed(0)}` : '--';
  };
  const fmtLiquidity = (liq: number) => {
    if (liq >= 1e9) return `$${(liq / 1e9).toFixed(2)}B`;
    if (liq >= 1e6) return `$${(liq / 1e6).toFixed(2)}M`;
    if (liq >= 1e3) return `$${(liq / 1e3).toFixed(0)}K`;
    return liq > 0 ? `$${liq.toFixed(0)}` : '--';
  };
  const fmtTimeAgo = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };
  const shortenAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const isPositive = change24h >= 0;
  
  // Swap page URL with pre-selected token
  const swapUrl = `/swap?from=${asset.symbol}`;

  return (
    <main className="min-h-screen bg-black text-white">
      <Header breadcrumb={asset.symbol} />

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            {logoUri ? (
              <img src={logoUri} alt={asset.symbol} className="w-16 h-16 rounded-full border border-slate-700" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-2xl font-bold border border-slate-600">₿</div>
            )}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold">{asset.symbol}</h1>
                <span className={`text-xs px-2.5 py-1 rounded tracking-wider uppercase ${asset.custodyType === "decentralized" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-slate-800 text-slate-400 border border-slate-700"}`}>{asset.custodyType}</span>
              </div>
              <p className="text-slate-500">{asset.name}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold mb-1" suppressHydrationWarning>{fmt(price)}</div>
            <div className={`text-lg font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{change24h.toFixed(2)}% (24h)
            </div>
          </div>
        </div>

        <div className="border border-slate-800 p-6 mb-8">
          <h3 className="text-slate-500 text-xs tracking-widest uppercase mb-6">MARKET METRICS</h3>
          <div className="grid grid-cols-3 gap-6">
            <MetricTooltip
              label="PRICE"
              value={fmt(price)}
              sublabel={`${isPositive ? '+' : ''}${change24h.toFixed(2)}%`}
              description="Current market price from DexScreener's highest liquidity pool"
              valueColor={isPositive ? 'text-green-400' : 'text-red-400'}
            />
            <MetricTooltip
              label="MARKET CAP"
              value={fmtTVL(tokenSupply, price)}
              sublabel="Total value"
              description="Total market capitalization. Calculated as circulating supply × current price"
            />
            <MetricTooltip
              label="SUPPLY"
              value={`${fmtSupply(tokenSupply)} ${asset.symbol}`}
              sublabel="Circulating"
              description={`Total circulating supply on Solana${asset.symbol.includes('BTC') ? '. Does not include Bitcoin locked on other chains' : ''}`}
            />
            <MetricTooltip
              label="LIQUIDITY"
              value={fmtLiquidity(totalLiquidity)}
              sublabel="All DEXes"
              description="Sum of all liquidity pools across DEXes. Higher liquidity means lower slippage on trades"
            />
            <MetricTooltip
              label="VOLUME"
              value={fmtVolume(totalVolume)}
              sublabel="24 hours"
              description="Total trading volume across all pools in the last 24 hours"
            />
            <MetricTooltip
              label="POOLS"
              value={marketPairs.length.toString()}
              sublabel="Active"
              description="Number of active trading pools across different DEXes (Orca, Raydium, Meteora, etc.)"
            />
          </div>
        </div>

        <div className="border border-slate-800 rounded-lg bg-black p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {(['1D', '1W', '1M', '3M', '1Y'] as const).map((tf) => (
                <button key={tf} onClick={() => setTimeframe(tf)} className={`px-3 py-1.5 text-xs tracking-wider rounded ${timeframe === tf ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>{tf}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-slate-600 text-xs tracking-wider uppercase">Live</span>
            </div>
          </div>
          <PriceChart data={chartData} positive={isPositive} loading={chartLoading} />
        </div>

        <div className="flex gap-1 mb-6 p-1 bg-slate-900/50 rounded-lg w-fit">
          {[
            { key: 'markets', label: 'MARKETS' },
            { key: 'holders', label: 'HOLDERS' },
            { key: 'history', label: 'HISTORY' },
            { key: 'metadata', label: 'METADATA' }
          ].map((tab) => (
            <button 
              key={tab.key} 
              onClick={() => setActiveTab(tab.key as typeof activeTab)} 
              className={`px-4 py-2 text-sm tracking-wider rounded ${activeTab === tab.key ? 'bg-white text-black font-bold' : 'text-slate-500 hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'markets' && (
          <div className="space-y-4">
            <div className="p-6 border border-slate-800 rounded-lg">
              <h3 className="text-xs tracking-widest uppercase text-slate-500 mb-4">LIQUIDITY POOLS</h3>
              {marketPairs.length > 0 ? (
                <>
                  <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[48px_1fr_140px_140px] gap-4 px-4 py-3 bg-slate-900/50 border-b border-slate-800 text-xs text-slate-500 tracking-widest uppercase">
                      <div></div>
                      <div>PAIR</div>
                      <div className="text-right">LIQUIDITY</div>
                      <div className="text-right">24H VOLUME</div>
                    </div>
                    {(showAllPools ? marketPairs : marketPairs.slice(0, 10)).map((pair, i) => (
                      <a 
                        key={`${pair.dex}-${pair.baseToken}-${pair.quoteToken}-${i}`}
                        href={pair.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="grid grid-cols-[48px_1fr_140px_140px] gap-4 px-4 py-3 items-center border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors"
                      >
                        <div className="flex items-center">
                          {dexLogos[pair.dex.toLowerCase()] ? (
                            <img 
                              src={dexLogos[pair.dex.toLowerCase()]} 
                              alt={pair.dex}
                              className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs text-slate-600">
                              {pair.dex.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col justify-center">
                          <div className="text-white font-medium">{pair.baseToken}-{pair.quoteToken}</div>
                          <div className="text-slate-500 text-xs uppercase">{pair.dex}</div>
                        </div>
                        <div className="text-right text-white">
                          {fmtLiquidity(pair.liquidity)}
                        </div>
                        <div className="text-right text-slate-400">
                          {fmtVolume(pair.volume24h)}
                        </div>
                      </a>
                    ))}
                  </div>
                  
                  {marketPairs.length > 10 && (
                    <div className="mt-4 text-center">
                      {!showAllPools ? (
                        <button 
                          onClick={() => setShowAllPools(true)}
                          className="text-slate-500 hover:text-white text-sm tracking-wider uppercase transition-colors"
                        >
                          LOAD {marketPairs.length - 10} MORE POOLS →
                        </button>
                      ) : (
                        <div className="text-slate-600 text-xs">
                          Showing all {marketPairs.length} pools
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-slate-500 text-center py-8">Loading pool data...</div>
              )}
            </div>

            <div className="p-6 border border-slate-800 rounded-lg">
              <h3 className="text-xs tracking-widest uppercase text-slate-500 mb-3">YIELD OPPORTUNITIES</h3>
              <div className="text-center py-8">
                <div className="text-white font-bold mb-2">Coming Soon</div>
                <p className="text-slate-400 text-sm max-w-md mx-auto mb-4">
                  We're partnering with leading protocols to bring you verified yield opportunities. 
                  Join the waitlist to be notified when yield products launch.
                </p>
                <button className="px-6 py-2 border border-slate-700 text-slate-300 hover:bg-slate-900 rounded tracking-wider text-sm uppercase transition-colors">
                  JOIN WAITLIST
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'holders' && (
          <div className="space-y-4">
            <div className="border border-slate-800 p-6">
              <h3 className="text-slate-500 text-xs tracking-widest uppercase mb-6">HOLDER METRICS</h3>
              <div className="grid grid-cols-3 gap-6">
                <MetricTooltip
                  label="LARGEST HOLDER"
                  value={`${topHolderPct.toFixed(2)}%`}
                  sublabel="Single address"
                  description="Percentage of total supply held by the single largest address"
                />
                <MetricTooltip
                  label="TOP 5 CONCENTRATION"
                  value={`${holders.slice(0, 5).reduce((sum, h) => sum + h.percentage, 0).toFixed(2)}%`}
                  sublabel="Top 5 addresses"
                  description="Combined percentage held by the 5 largest holders"
                />
                <MetricTooltip
                  label="TOP 10 CONCENTRATION"
                  value={`${holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0).toFixed(2)}%`}
                  sublabel="Top 10 addresses"
                  description="Combined percentage held by the 10 largest holders. Lower concentration indicates better distribution"
                />
              </div>
            </div>

            <div className="p-6 border border-slate-800 rounded-lg">
              <h3 className="text-xs tracking-widest uppercase text-slate-500 mb-4">TOP HOLDERS</h3>
              {holders.length > 0 ? (
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[40px_48px_1fr_140px_100px] gap-4 px-4 py-3 bg-slate-900/50 border-b border-slate-800 text-xs text-slate-500 tracking-widest uppercase">
                    <div className="text-center">#</div>
                    <div></div>
                    <div>ADDRESS</div>
                    <div className="text-right">BALANCE</div>
                    <div className="text-right">SUPPLY</div>
                  </div>
                  {holders.map((holder, i) => {
                    const knownEntity = identifyHolder(holder.address, i, holder.percentage, asset.symbol);
                    const solscanUrl = `https://solscan.io/account/${holder.address}`;
                    
                    return (
                      <div 
                        key={holder.address} 
                        className="grid grid-cols-[40px_48px_1fr_140px_100px] gap-4 px-4 py-3 items-center border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors"
                      >
                        <div className="text-center text-slate-500 text-sm">
                          {i + 1}
                        </div>
                        
                        <div className="flex items-center">
                          {knownEntity?.logo ? (
                            <img 
                              src={knownEntity.logo} 
                              alt={knownEntity.name}
                              className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs text-slate-600">
                              {i + 1}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col justify-center">
                          {knownEntity && (
                            <>
                              <div className="text-white font-medium text-sm mb-1">
                                {knownEntity.name}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 border border-slate-700 text-slate-400 uppercase tracking-wider">
                                  {knownEntity.type}
                                </span>
                              </div>
                            </>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-slate-400 text-xs font-mono">
                              {shortenAddress(holder.address)}
                            </code>
                            <a 
                              href={solscanUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-600 hover:text-white text-xs transition-colors"
                            >
                              Solscan ↗
                            </a>
                          </div>
                        </div>
                        
                        <div className="text-right text-white">
                          {holder.balance.toFixed(2)} {asset.symbol}
                        </div>
                        
                        <div className="text-right text-slate-400">
                          {holder.percentage.toFixed(2)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-slate-500 text-center py-8">Loading holder data...</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {ASSET_CONTEXT[asset.symbol] && (
              <div className="p-6 border border-slate-800 rounded-lg">
                <h3 className="text-xs tracking-widest uppercase text-slate-500 mb-4">ABOUT {asset.symbol}</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  {ASSET_CONTEXT[asset.symbol].description}
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Use Case</div>
                    <div className="text-white">{ASSET_CONTEXT[asset.symbol].useCase}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Custody</div>
                    <div className="text-white">{ASSET_CONTEXT[asset.symbol].custodyModel}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Launched</div>
                    <div className="text-white">{ASSET_CONTEXT[asset.symbol].launched}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="border border-slate-800 p-6">
              <h3 className="text-slate-500 text-xs tracking-widest uppercase mb-6">ACTIVITY METRICS</h3>
              <div className="grid grid-cols-3 gap-6">
                <MetricTooltip
                  label="24H VOLUME"
                  value={fmtVolume(totalVolume)}
                  sublabel="All pools"
                  description="Total trading volume across all liquidity pools in the last 24 hours"
                />
                <MetricTooltip
                  label="VOLUME/TVL"
                  value={`${tokenSupply && totalVolume > 0 ? ((totalVolume / (tokenSupply * price)) * 100).toFixed(2) : '0.00'}%`}
                  sublabel="Usage ratio"
                  description="Trading volume as percentage of total value locked. Higher ratio indicates more active usage and liquidity efficiency"
                />
                <MetricTooltip
                  label="ACTIVE POOLS"
                  value={marketPairs.length.toString()}
                  sublabel="DEX integrations"
                  description="Number of active liquidity pools across different DEXes. More pools provide better price discovery and redundancy"
                />
              </div>
            </div>

            <div className="p-6 border border-slate-800 rounded-lg">
              <h3 className="text-xs tracking-widest uppercase text-slate-500 mb-4">RECENT SWAPS</h3>
              
              {loadingSwaps ? (
                <div className="text-center py-12 text-slate-500">
                  <div className="text-sm">Loading recent swaps...</div>
                  <div className="text-xs text-slate-600 mt-1">This may take a few seconds</div>
                </div>
              ) : recentSwaps.length > 0 ? (
                <>
                  <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[100px_80px_140px_140px_80px] gap-4 px-4 py-3 bg-slate-900/50 border-b border-slate-800 text-xs text-slate-500 tracking-widest uppercase">
                      <div>TIME</div>
                      <div>TYPE</div>
                      <div className="text-right">AMOUNT</div>
                      <div className="text-right">VALUE</div>
                      <div className="text-right">TX</div>
                    </div>
                    
                    {recentSwaps.map((swap) => {
                      const solscanUrl = `https://solscan.io/tx/${swap.signature}`;
                      
                      return (
                        <div 
                          key={swap.signature}
                          className="grid grid-cols-[100px_80px_140px_140px_80px] gap-4 px-4 py-3 items-center border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors"
                        >
                          <div className="text-slate-500 text-sm">
                            {fmtTimeAgo(swap.timestamp)}
                          </div>
                          
                          <div className="text-white text-sm uppercase">
                            {swap.type}
                          </div>
                          
                          <div className="text-right text-white">
                            {swap.amount.toFixed(4)} {asset.symbol}
                          </div>
                          
                          <div className="text-right text-slate-400">
                            {swap.amountUSD > 0 ? `$${swap.amountUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '--'}
                          </div>
                          
                          <div className="text-right">
                            <a
                              href={solscanUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-600 hover:text-white text-xs transition-colors"
                            >
                              View ↗
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-3 text-center text-xs text-slate-600">
                    Showing {recentSwaps.length} most recent swaps
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <div className="text-sm mb-2">No recent swaps found</div>
                  <div className="text-xs text-slate-600">
                    Swap transactions will appear here once they occur
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border border-slate-800 rounded-lg">
              <h3 className="text-xs tracking-widest uppercase text-slate-500 mb-4">ADOPTION INDICATORS</h3>
              <div className="space-y-2 text-sm">
                {marketPairs.length >= 10 && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-green-400">✓</span>
                    <span>Active trading across {marketPairs.length} liquidity pools</span>
                  </div>
                )}
                {totalLiquidity >= 10_000_000 && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-green-400">✓</span>
                    <span>{fmtLiquidity(totalLiquidity)} in total liquidity</span>
                  </div>
                )}
                {totalVolume >= 1_000_000 && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-green-400">✓</span>
                    <span>Strong trading activity ({fmtVolume(totalVolume)}/24h)</span>
                  </div>
                )}
                {marketPairs.some(p => ['orca', 'raydium', 'meteora'].includes(p.dex.toLowerCase())) && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-green-400">✓</span>
                    <span>Integrated with major Solana DEXes</span>
                  </div>
                )}
                {((totalVolume / (tokenSupply || 1) / price) * 100) > 1 && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-green-400">✓</span>
                    <span>Healthy volume-to-TVL ratio indicating active usage</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="space-y-4">
            {ASSET_METADATA[asset.symbol] && (
              <>
                {/* Security & Audits */}
                <div className="p-6 border border-slate-800 rounded-lg">
                  <h3 className="text-xs tracking-widest uppercase text-slate-500 mb-4">SECURITY & AUDITS</h3>
                  
                  <div className="space-y-4">
                    {/* Audits */}
                    <div>
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Audited By</div>
                      <div className="space-y-2">
                        {ASSET_METADATA[asset.symbol].security.audits.map((audit, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="text-green-400">✓</span>
                            <span className="text-white">{audit.firm}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-500">{audit.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Custody */}
                    <div>
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Custody Provider</div>
                      <div className="text-white font-medium">{ASSET_METADATA[asset.symbol].security.custody}</div>
                    </div>

                    {/* Security Features */}
                    <div>
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Security Features</div>
                      <div className="space-y-1">
                        {ASSET_METADATA[asset.symbol].security.features.map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                            <span className="text-green-400">✓</span>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Peg Mechanism */}
                <div className="p-6 border border-slate-800 rounded-lg">
                  <h3 className="text-xs tracking-widest uppercase text-slate-500 mb-4">PEG MECHANISM</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">How {asset.symbol} Maintains 1:1 Backing</div>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {ASSET_METADATA[asset.symbol].peg.explanation}
                      </p>
                    </div>

                    <div>
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Verification Process</div>
                      <div className="space-y-1">
                        {ASSET_METADATA[asset.symbol].peg.mechanism.map((step, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                            <span className="text-slate-600">•</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Redemption */}
                <div className="p-6 border border-slate-800 rounded-lg">
                  <h3 className="text-xs tracking-widest uppercase text-slate-500 mb-4">REDEMPTION</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Traditional Process</div>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {ASSET_METADATA[asset.symbol].redemption.traditional}
                      </p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                      <div className="text-white font-medium text-sm mb-2">Why Solis is Better</div>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {ASSET_METADATA[asset.symbol].redemption.solisAdvantage}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Technical Details */}
            <div className="p-6 border border-slate-800 rounded-lg">
              <h3 className="text-xs tracking-widest uppercase text-slate-500 mb-4">TECHNICAL DETAILS</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">
                    Mint Address
                    <span className="text-slate-600 ml-2 normal-case">Unique on-chain identifier for this token</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <code className="text-sm text-slate-300 bg-slate-900 px-3 py-2 rounded flex-1 overflow-hidden text-ellipsis font-mono">
                      {asset.mint}
                    </code>
                    <button 
                      onClick={copyMint} 
                      className="px-4 py-2 text-xs font-bold tracking-wider uppercase bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <a
                      href={`https://solscan.io/token/${asset.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-600 hover:text-white transition-colors"
                    >
                      Solscan ↗
                    </a>
                    <a
                      href={`https://solana.fm/address/${asset.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-600 hover:text-white transition-colors"
                    >
                      SolanaFM ↗
                    </a>
                    <a
                      href={`https://explorer.solana.com/address/${asset.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-600 hover:text-white transition-colors"
                    >
                      Solana Explorer ↗
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">
                      Decimals
                      <span className="text-slate-600 ml-2 normal-case">Fractional precision (8 = satoshi level)</span>
                    </div>
                    <div className="text-white font-medium">{asset.decimals}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">
                      Token Standard
                      <span className="text-slate-600 ml-2 normal-case">Solana's fungible token format</span>
                    </div>
                    <div className="text-white font-medium">SPL Token</div>
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">
                    Mint Authority
                    <span className="text-slate-600 ml-2 normal-case">Address that can create new tokens</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-white font-medium font-mono text-sm">
                      {tokenAuthority === 'None' ? (
                        <span className="text-green-400">Immutable (None)</span>
                      ) : (
                        shortenAddress(tokenAuthority)
                      )}
                    </code>
                    {tokenAuthority !== 'None' && (
                      <a
                        href={`https://solscan.io/account/${tokenAuthority}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-600 hover:text-white transition-colors"
                      >
                        View ↗
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">
                    Freeze Authority
                    <span className="text-slate-600 ml-2 normal-case">Can freeze accounts for compliance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-white font-medium font-mono text-sm">
                      {freezeAuthority === 'None' ? (
                        <span className="text-green-400">None</span>
                      ) : (
                        shortenAddress(freezeAuthority)
                      )}
                    </code>
                    {freezeAuthority !== 'None' && (
                      <a
                        href={`https://solscan.io/account/${freezeAuthority}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-600 hover:text-white transition-colors"
                      >
                        View ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Official Resources */}
            {ASSET_METADATA[asset.symbol]?.resources && (
              <div className="p-6 border border-slate-800 rounded-lg">
                <h3 className="text-xs tracking-widest uppercase text-slate-500 mb-4">OFFICIAL RESOURCES</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {ASSET_METADATA[asset.symbol].resources.website && (
                    <a
                      href={ASSET_METADATA[asset.symbol].resources.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 border border-slate-800 rounded hover:border-slate-700 transition-colors group"
                    >
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Website</div>
                      <div className="text-white text-sm group-hover:text-slate-300">Visit official site ↗</div>
                    </a>
                  )}
                  
                  {ASSET_METADATA[asset.symbol].resources.docs && (
                    <a
                      href={ASSET_METADATA[asset.symbol].resources.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 border border-slate-800 rounded hover:border-slate-700 transition-colors group"
                    >
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Documentation</div>
                      <div className="text-white text-sm group-hover:text-slate-300">Technical docs ↗</div>
                    </a>
                  )}
                  
                  {ASSET_METADATA[asset.symbol].resources.support && (
                    <a
                      href={ASSET_METADATA[asset.symbol].resources.support}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 border border-slate-800 rounded hover:border-slate-700 transition-colors group"
                    >
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Support</div>
                      <div className="text-white text-sm group-hover:text-slate-300">Get help ↗</div>
                    </a>
                  )}
                  
                  {ASSET_METADATA[asset.symbol].resources.explorer && (
                    <a
                      href={ASSET_METADATA[asset.symbol].resources.explorer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 border border-slate-800 rounded hover:border-slate-700 transition-colors group"
                    >
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Transparency</div>
                      <div className="text-white text-sm group-hover:text-slate-300">View reserves ↗</div>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-6 border border-slate-800 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">Ready to swap {asset.symbol}?</h3>
              <p className="text-slate-500 text-sm">Trade with 0.5% fees on Solis</p>
            </div>
            <Link href={swapUrl} className="px-6 py-3 bg-white text-black font-bold rounded hover:bg-slate-100 tracking-wider uppercase">
              Swap {asset.symbol} →
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800">
          <Link href="/" className="text-slate-500 hover:text-white text-sm inline-flex items-center gap-2 group">
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Back to all assets
          </Link>
        </div>
      </div>
    </main>
  );
}
