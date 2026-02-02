# SOLIS — 24/7 Capital Markets

> Tokenized markets. Real assets. Your custody.

Solis is a trading platform for tokenized assets on Solana — Bitcoin wrappers, stablecoins, and soon stocks, metals, and commodities. All 24/7, all self-custody, with optional ZK-shielded swaps via PrivacyCash.

**Live on Solana Mainnet** · Built for [Privacy Hack 2026](https://solana.com/privacyhack)

---

## What It Does

Solis gives you one place to discover, compare, swap, and privately trade tokenized assets on Solana.

**Discover** — 14 tokenized assets across 2 categories (BTC wrappers + stablecoins) with live market data, fear/greed index, BTC dominance, and stablecoin dominance metrics.

**Compare** — Every asset has a detail page with 4 tabs: Markets (liquidity pools, DEX integrations), Holders (top 10, concentration), History (recent swaps, activity), and Metadata (custody model, audits, peg mechanism).

**Swap** — Best-price routing via Jupiter across all 14 assets. Platform fee collected via Jupiter's `platformFeeBps` with smart ATA-based fee routing.

**Shield** — Toggle Shield Mode to deposit swap output into a PrivacyCash privacy pool. Withdraw later to any wallet — a groth16 ZK proof generated in your browser breaks the on-chain link between deposit and withdrawal. No one can trace where the funds came from.

---

## Demo

📹 **
https://youtu.be/LbwS2gMyBls?si=aGc47M-ltEKkRrfv
---

## Bounties Targeted

| Bounty | Category | Why |
|--------|----------|-----|
| **PrivacyCash** | Best Integration to Existing App | PrivacyCash SDK integrated into a full trading platform — shield deposit + ZK withdraw working on mainnet |
| **PrivacyCash** | Best Overall App | Most complete PrivacyCash-powered application with swap + shield + withdraw flow |
| **Helius** | Best Privacy Project with Helius | Helius RPC powers all token metadata, holder data, transaction history, and network calls |
| **Open Track** | Pool Prize | Full trading platform that makes privacy a toggle inside the natural swap flow |
| **Private Payments** | Track 01 | Shield swaps are private transfers — swap into privacy pool, withdraw to any address untraceably |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15, React, TypeScript |
| Styling | Tailwind CSS, Space Mono |
| Swaps | Jupiter API (v1 endpoint, `platformFeeBps`) |
| RPC & Data | Helius (metadata, holders, transactions) |
| Market Data | DexScreener (price, volume, liquidity) |
| Privacy | PrivacyCash SDK (groth16 ZK proofs, WASM circuits) |
| Wallet | Solana Wallet Adapter (Phantom, Solflare, etc.) |
| Network | Solana Mainnet |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    SOLIS FRONTEND                    │
│              Next.js 15 · Tailwind CSS              │
├─────────────┬──────────────┬────────────────────────┤
│  Homepage   │  Asset Pages │      Swap Page          │
│  14 tokens  │  4-tab view  │  Standard + Shield      │
│  Live data  │  Holders/Tx  │  Jupiter + PrivacyCash  │
└──────┬──────┴──────┬───────┴────────┬───────────────┘
       │             │                │
       ▼             ▼                ▼
┌──────────┐  ┌───────────┐  ┌───────────────────────┐
│DexScreener│  │  Helius   │  │      Jupiter API      │
│Price/Vol  │  │  RPC +    │  │  Quote → Swap → Fee   │
│Liquidity  │  │  Metadata │  │  platformFeeBps: 50   │
└───────────┘  └───────────┘  └───────────┬───────────┘
                                          │
                              ┌───────────▼───────────┐
                              │    Shield Mode ON?    │
                              │    ┌─────────────┐    │
                              │    │ PrivacyCash  │    │
                              │    │ ZK Deposit   │    │
                              │    │ WASM Circuit  │    │
                              │    └──────┬──────┘    │
                              │           ▼           │
                              │    Privacy Pool       │
                              │    (on-chain)         │
                              │           │           │
                              │    ┌──────▼──────┐    │
                              │    │ ZK Withdraw  │    │
                              │    │ groth16 proof│    │
                              │    │ → any wallet │    │
                              │    └─────────────┘    │
                              └───────────────────────┘
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- A Solana wallet (Phantom recommended)
- SOL for gas fees

### Setup

```bash
# Clone
git clone https://github.com/deFiFello/solis-icm-directory.git
cd solis-icm-directory

# Install
npm install

# Copy WASM files for PrivacyCash ZK circuits
mkdir -p public/circuit2
cp node_modules/privacycash/circuit2/transaction2.wasm public/circuit2/
cp node_modules/privacycash/circuit2/transaction2.zkey public/circuit2/

# Environment variables
cp .env.example .env.local
# Edit .env.local with your API keys (see below)

# Build & run
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

Create a `.env.local` file from `.env.example` and fill in your own keys:

```
NEXT_PUBLIC_JUPITER_API_KEY=     # Get at https://station.jup.ag
NEXT_PUBLIC_HELIUS_API_KEY=      # Get at https://helius.dev
NEXT_PUBLIC_FEE_WALLET=          # Your Solana wallet for fee collection
```

---

## Assets Supported (V1)

### Tokenized Bitcoin (6)
| Token | Custody | Custodian |
|-------|---------|-----------|
| cbBTC | Centralized | Coinbase |
| WBTC | Centralized | BitGo |
| zBTC | Decentralized | Zeus Network (MPC Guardians) |
| tBTC | Decentralized | Threshold Network |
| xBTC | Centralized | OKX |
| LBTC | Centralized | Lombard |

### Stablecoins (7)
USDC · USDT · PYUSD (PayPal) · USD1 (World Liberty) · PRIME · CASH · hyUSD (Hylo)

### Base Layer
SOL

---

## Fee Structure

| Action | Fee | Notes |
|--------|-----|-------|
| Standard Swap | 0.5% | Jupiter `platformFeeBps` on output |
| Shield Swap | 0.75% | Includes ZK proof computation |
| Shield Withdraw | 0.35% + rent | Set by PrivacyCash protocol (~0.006 SOL or ~0.61 USDC rent per withdrawal) |

Minimum withdrawal: 0.01 SOL / 2 USDC (enforced by PrivacyCash protocol).

Smart fee routing avoids WSOL (native SOL ATAs don't persist). If the fee wallet's ATA doesn't exist for a token pair, the swap executes without fees as a fallback — swaps never break.

---

## Privacy: How Shield Mode Works

1. **Swap** — Jupiter executes the swap (e.g., USDC → SOL)
2. **Deposit** — Output is deposited into the PrivacyCash privacy pool. A WASM circuit generates an encrypted UTXO commitment on-chain.
3. **Withdraw** — User withdraws to any wallet address. A groth16 ZK proof is generated locally in the browser, proving ownership without revealing which deposit is being claimed.

The zero-knowledge proof cryptographically breaks the on-chain link between the depositor and the withdrawal recipient. No one — not Solis, not an on-chain observer — can connect the two.

Shield Mode is available for SOL and USDC output tokens.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Homepage — tabs, ticker, metrics
│   ├── swap/page.tsx         # Swap page — Jupiter + Shield Mode
│   ├── docs/page.tsx         # Documentation
│   └── asset/[symbol]/       # Dynamic asset detail pages
├── components/               # Shared UI (Header, MarketTicker, etc.)
├── contexts/
│   └── PrivacyCashContext.tsx # ZK privacy state management
├── lib/
│   ├── jupiter.ts            # Jupiter swap + smart fee routing
│   └── privacycash-loader.ts # WASM circuit loading for ZK proofs
└── services/
    ├── config.ts             # Token mints, asset config
    ├── heliusMetadata.ts     # Helius token metadata
    ├── dexScreener.ts        # DexScreener market data
    └── jupiterPrice.ts       # Jupiter price feeds
```

---

## Known Issues & Active Development

This is the V1 hackathon submission. The platform is functional on mainnet but this is an actively evolving project. There are known enhancements in progress and you should expect frequent updates to aesthetics, functionality, and data coverage going forward.

**Current known issues:**
- Stablecoin asset pages not yet created (7 stablecoins need `/asset/[symbol]` detail pages)
- Missing token logos for CASH, PRIME, hyUSD (Helius returns null — needs fallback URIs)
- SOL market cap displays "--" (native token, not SPL — needs circulating supply source)
- Withdraw UI needs minimum amount validation (0.01 SOL / 2 USDC per PrivacyCash protocol)
- Yield tab shows "Coming Soon" (requires real protocol integrations with referral tracking)
- Design, layout, and UX refinements ongoing

---

## Roadmap

- **V1 (Live)** — 14 assets, Jupiter swaps, Shield Mode, asset pages
- **V2** — Native BTC → zBTC bridging via Zeus BitcoinKit (free bridging as acquisition)
- **V3** — Tokenized stocks, metals, commodities
- **V4** — Real estate, fiat on-ramp, mobile app

---

## Team

Solo founder + junior cybersecurity analyst

---

## License

MIT
