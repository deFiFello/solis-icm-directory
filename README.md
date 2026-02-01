# Solis

Swap BTC on Solana. Simple. Secure. Fast.

## Features

- **BTC-First**: Token selectors prioritize wrapped Bitcoin (zBTC, cbBTC, WBTC, tBTC)
- **MPC-First**: zBTC (Zeus Network) highlighted as the decentralized option
- **MEV Protection**: Jito bundles enabled by default
- **Unified Portfolio**: See all your wrapped BTC in one balance
- **Mobile Ready**: Responsive design, Solana Seeker compatible (MWA)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Wallet**: Solana Wallet Adapter (Phantom, Ledger, Seeker)
- **Routing**: Jupiter API v6
- **State**: Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/solis.git
cd solis

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Helius API key

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_HELIUS_RPC` | Helius RPC endpoint | Yes |
| `NEXT_PUBLIC_COINBASE_AFFILIATE` | Coinbase referral code | No |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Plausible analytics domain | No |

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Manual Build

```bash
npm run build
npm start
```

## Project Structure

```
solis/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout with providers
│   │   ├── page.tsx        # Main swap page
│   │   └── globals.css     # Tailwind + design tokens
│   ├── components/
│   │   ├── SwapCard.tsx    # Main swap interface
│   │   ├── TokenSelector.tsx
│   │   ├── Portfolio.tsx   # BTC balance view
│   │   ├── MevToggle.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── WalletButton.tsx
│   │   └── SolanaProvider.tsx
│   ├── lib/
│   │   ├── jupiter.ts      # Jupiter API client
│   │   └── tokens.ts       # BTC wrapper registry
│   └── stores/
│       └── swap.ts         # Zustand state
├── public/
│   └── tokens/             # Token logos
├── tailwind.config.js
├── next.config.js
└── package.json
```

## Design

- **Background**: Pure black (#000000)
- **Accent**: BTC Orange (#F7931A)
- **Font**: Space Mono (monospace)
- **Inspired by**: Orb (Helius block explorer)

## Roadmap

- [x] Core swap functionality
- [x] MEV protection (Jito)
- [x] Portfolio view
- [ ] Yield opportunities (Kamino, Drift)
- [ ] Arbitrage alerts
- [ ] Premium mode (0.05% fee)
- [ ] Arcium privacy integration

## License

MIT
