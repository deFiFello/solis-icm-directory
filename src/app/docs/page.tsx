"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "icm", label: "Internet Capital Markets" },
  { id: "assets", label: "Asset Classes" },
  { id: "privacy", label: "Shield Mode" },
  { id: "yield", label: "Yield Strategies" },
  { id: "fees", label: "Fees" },
  { id: "roadmap", label: "Roadmap" },
  { id: "risks", label: "Risks" },
  { id: "glossary", label: "Glossary" },
];

const GLOSSARY = [
  { term: "APY", definition: "Annual Percentage Yield — projected yearly return with compounding included." },
  { term: "Atomic Settlement", definition: "Trade and transfer happen in the same block (~400ms on Solana). No waiting period." },
  { term: "Centralized Custody", definition: "A single entity (Coinbase, BitGo) holds the underlying asset. Regulated and insured, but requires trust." },
  { term: "Decentralized Custody", definition: "Multiple independent parties (Guardians) must agree to move funds. No single point of failure." },
  { term: "ICM", definition: "Internet Capital Markets — on-chain financial infrastructure that operates 24/7 globally with instant settlement." },
  { term: "Impermanent Loss (IL)", definition: "When providing liquidity, price divergence between paired assets can result in less value than simply holding." },
  { term: "LST", definition: "Liquid Staking Token — a token representing staked assets that remains liquid and tradeable." },
  { term: "MEV", definition: "Maximal Extractable Value — profit extracted by reordering, inserting, or censoring transactions. Shield Mode prevents this." },
  { term: "Peg", definition: "The 1:1 relationship between a wrapped token and its underlying asset (e.g., 1 cbBTC = 1 BTC)." },
  { term: "Privacy Pool", definition: "A smart contract that pools deposits from many users. Withdrawals use ZK proofs to break the on-chain link between sender and recipient." },
  { term: "PrivacyCash", definition: "Solana-native privacy protocol using zero-knowledge proofs. Powers Shield Mode on Solis for untraceable swaps." },
  { term: "RWA", definition: "Real World Assets — traditional assets (T-Bills, real estate, commodities) tokenized on-chain." },
  { term: "Shield Mode", definition: "Solis feature that routes swap output into a PrivacyCash privacy pool. Withdrawals are untraceable via ZK proofs." },
  { term: "TVL", definition: "Total Value Locked — the total amount of assets deposited in a protocol. Higher TVL generally indicates more trust." },
  { term: "Wrapper", definition: "A token that represents another asset. Wrapped BTC tokens represent Bitcoin held in custody." },
  { term: "Zero-Knowledge Proof (ZKP)", definition: "A cryptographic method that proves a statement is true without revealing any underlying data. Used in Shield Mode to verify withdrawals without exposing the depositor." },
  { term: "zBTC", definition: "Zeus Network's decentralized Bitcoin wrapper on Solana. Secured by distributed Guardians using multi-party computation." },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const handleScroll = () => {
      const sections = SECTIONS.map(s => ({
        id: s.id,
        offset: document.getElementById(s.id)?.offsetTop || 0
      }));
      const scrollPos = window.scrollY + 150;
      for (let i = sections.length - 1; i >= 0; i--) {
        if (scrollPos >= sections[i].offset) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <Header activePage="docs" />

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-[#222]">
          <nav className="sticky top-16 p-6 space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={`block w-full text-left px-4 py-2 text-sm tracking-wide transition-colors ${
                  activeSection === section.id
                    ? "bg-white text-black font-bold"
                    : "text-[#666] hover:text-white"
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 px-8 lg:px-16 py-12 max-w-4xl">

          {/* Overview */}
          <section id="overview" className="mb-20 scroll-mt-24">
            <p className="text-[#666] text-xs tracking-widest uppercase mb-4">Welcome to Solis</p>
            <h1 className="text-4xl font-bold tracking-wide mb-6">24/7 Capital Markets</h1>
            <div className="h-px bg-[#222] mb-8" />

            <p className="text-[#a0a0a0] text-lg leading-relaxed mb-6">
              Solis is a trading platform for <span className="text-white">tokenized assets on Solana</span> —
              Bitcoin wrappers, stablecoins, and soon stocks, metals, and commodities. All 24/7. All self-custody.
            </p>
            <p className="text-[#a0a0a0] leading-relaxed mb-8">
              No brokers. No banks. No market hours. Connect your wallet, swap between assets with best-price
              routing via Jupiter, and optionally shield your output through PrivacyCash for untraceable withdrawals.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Assets", value: "14", sub: "BTC wrappers + stablecoins" },
                { label: "Settlement", value: "400ms", sub: "Atomic finality" },
                { label: "Availability", value: "24/7", sub: "Always open" },
                { label: "Privacy", value: "ZK", sub: "PrivacyCash shielding" },
              ].map((s) => (
                <div key={s.label} className="p-4 border border-[#222]">
                  <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
                  <div className="text-[#666] text-xs tracking-widest uppercase">{s.label}</div>
                  <div className="text-[#444] text-xs mt-1">{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="p-6 border border-[#222]">
              <h3 className="text-white font-bold mb-3">What can you do with Solis?</h3>
              <div className="space-y-2 text-[#a0a0a0] text-sm">
                <div className="flex items-center gap-2"><span className="text-green-400">✓</span> Swap between 14 tokenized assets with Jupiter routing</div>
                <div className="flex items-center gap-2"><span className="text-green-400">✓</span> Compare Bitcoin wrappers by custody type and liquidity</div>
                <div className="flex items-center gap-2"><span className="text-green-400">✓</span> Shield swap output into a privacy pool via PrivacyCash</div>
                <div className="flex items-center gap-2"><span className="text-green-400">✓</span> Withdraw shielded funds to any wallet — untraceable via ZK proofs</div>
                <div className="flex items-center gap-2"><span className="text-green-400">✓</span> Track live market data, fear/greed index, and dominance metrics</div>
                <div className="flex items-center gap-2"><span className="text-green-400">✓</span> View detailed asset pages with holders, history, and metadata</div>
              </div>
            </div>
          </section>

          {/* ICM */}
          <section id="icm" className="mb-20 scroll-mt-24">
            <p className="text-[#666] text-xs tracking-widest uppercase mb-4">The Thesis</p>
            <h1 className="text-4xl font-bold tracking-wide mb-6">Why Internet Capital Markets?</h1>
            <div className="h-px bg-[#222] mb-8" />

            <p className="text-[#a0a0a0] leading-relaxed mb-8">
              On-chain markets are <span className="text-white">structurally superior</span> to traditional finance.
              Here is why the shift to Internet Capital Markets is inevitable:
            </p>

            <div className="mb-6 p-6 border border-[#222]">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold text-sm">1</span>
                <h3 className="text-xl font-bold">Fractional Ownership</h3>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 tracking-wider uppercase">Accessibility</span>
              </div>
              <p className="text-[#666] text-sm mb-3"><span className="text-[#a0a0a0]">Old way:</span> High-yield assets (Private Credit, T-Bills, Prime Real Estate) were for the 1%.</p>
              <p className="text-[#666] text-sm mb-3"><span className="text-[#a0a0a0]">New way:</span> Tokenization breaks these into $10 or $50 units. Anyone can participate.</p>
              <div className="p-4 bg-black border border-[#222]">
                <p className="text-white text-sm italic">&quot;You don&apos;t just buy an asset anymore. You own a fraction of a global, 24/7 liquid market.&quot;</p>
              </div>
            </div>

            <div className="mb-6 p-6 border border-[#222]">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold text-sm">2</span>
                <h3 className="text-xl font-bold">Atomic Settlement</h3>
                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 tracking-wider uppercase">Efficiency</span>
              </div>
              <p className="text-[#666] text-sm mb-3"><span className="text-[#a0a0a0]">Old way:</span> T+2 or T+3 settlement. Your money is dead for 48–72 hours while middlemen verify.</p>
              <p className="text-[#666] text-sm mb-3"><span className="text-[#a0a0a0]">New way:</span> On Solana, trade and transfer happen in the same 400ms block. Instant finality.</p>
              <div className="p-4 bg-black border border-[#222]">
                <p className="text-white text-sm italic">&quot;Your capital never sleeps. Compound gains while the legacy world waits for the bank to open Monday.&quot;</p>
              </div>
            </div>

            <div className="mb-6 p-6 border border-[#222]">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold text-sm">3</span>
                <h3 className="text-xl font-bold">Programmable Capital</h3>
                <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 tracking-wider uppercase">Utility</span>
              </div>
              <p className="text-[#666] text-sm mb-3"><span className="text-[#a0a0a0]">Old way:</span> Assets on a brokerage just sit there. Static.</p>
              <p className="text-[#666] text-sm mb-3"><span className="text-[#a0a0a0]">New way:</span> Tokenized assets are programmable. Use as collateral, auto-compound yield, or execute privately.</p>
              <div className="p-4 bg-black border border-[#222]">
                <p className="text-white text-sm italic">&quot;Solis shows you utility, not just price. Move from HODL to Productive in one click.&quot;</p>
              </div>
            </div>
          </section>

          {/* Assets */}
          <section id="assets" className="mb-20 scroll-mt-24">
            <p className="text-[#666] text-xs tracking-widest uppercase mb-4">Coverage</p>
            <h1 className="text-4xl font-bold tracking-wide mb-6">Asset Classes</h1>
            <div className="h-px bg-[#222] mb-8" />

            <p className="text-[#a0a0a0] leading-relaxed mb-8">
              Solis V1 covers tokenized Bitcoin and stablecoins on Solana, with expansion planned
              for stocks, metals, commodities, and real estate.
            </p>

            <div className="space-y-4 mb-8">
              {[
                { name: "Tokenized Bitcoin", status: "live", desc: "6 BTC wrappers on Solana with varying custody models", examples: "cbBTC (Coinbase), WBTC (BitGo), zBTC (Zeus), tBTC (Threshold), xBTC (OKX), LBTC (Lombard)" },
                { name: "Stablecoins", status: "live", desc: "7 USD-pegged stablecoins for trading and settlement", examples: "USDC, USDT, PYUSD (PayPal), USD1 (World Liberty), PRIME, CASH, hyUSD (Hylo)" },
                { name: "Tokenized Stocks", status: "coming", desc: "Fractionalized equities trading 24/7", examples: "AAPL, TSLA, SPY and more" },
                { name: "Metals & Commodities", status: "coming", desc: "Gold, silver, oil, and agricultural commodities", examples: "XAUT, PAXG, tokenized futures" },
                { name: "Real Estate", status: "coming", desc: "Property-backed tokens with rental yield distribution", examples: "Fractional ownership, physical redemption" },
              ].map((a) => (
                <div key={a.name} className={`p-5 border ${a.status === "live" ? "border-green-500/30 bg-green-500/5" : "border-[#222]"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white">{a.name}</h3>
                    <span className={`text-xs px-2 py-1 tracking-wider uppercase ${a.status === "live" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-[#111] text-[#666] border border-[#222]"}`}>
                      {a.status === "live" ? "Live" : "Coming Soon"}
                    </span>
                  </div>
                  <p className="text-[#a0a0a0] text-sm mb-1">{a.desc}</p>
                  <p className="text-[#444] text-xs">{a.examples}</p>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-bold mb-4">Understanding BTC Custody</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 border border-[#222]">
                <span className="text-xs px-2.5 py-1 bg-[#111] text-[#a0a0a0] border border-[#222] tracking-wider uppercase">Centralized</span>
                <h4 className="text-lg font-bold mt-3 mb-2">Institutional Custody</h4>
                <p className="text-[#666] text-sm mb-4">A single trusted entity holds the underlying Bitcoin. Regulated and insured, but requires trust.</p>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2 text-green-400">✓ <span className="text-[#a0a0a0]">Insurance & Regulation</span></div>
                  <div className="flex items-center gap-2 text-red-400">✗ <span className="text-[#a0a0a0]">Single point of failure</span></div>
                </div>
                <p className="text-[#444] text-xs mt-3">Examples: cbBTC (Coinbase), WBTC (BitGo), xBTC (OKX)</p>
              </div>
              <div className="p-6 border border-green-500/30 bg-green-500/5">
                <span className="text-xs px-2.5 py-1 bg-green-500/20 text-green-400 border border-green-500/30 tracking-wider uppercase">Decentralized</span>
                <h4 className="text-lg font-bold mt-3 mb-2">Distributed Guardians</h4>
                <p className="text-[#666] text-sm mb-4">Multiple independent parties must agree to move funds. No single entity controls your Bitcoin.</p>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2 text-green-400">✓ <span className="text-[#a0a0a0]">No single point of failure</span></div>
                  <div className="flex items-center gap-2 text-green-400">✓ <span className="text-[#a0a0a0]">Censorship resistant</span></div>
                </div>
                <p className="text-[#444] text-xs mt-3">Examples: zBTC (Zeus Network), tBTC (Threshold)</p>
              </div>
            </div>
          </section>

          {/* Shield Mode */}
          <section id="privacy" className="mb-20 scroll-mt-24">
            <p className="text-[#666] text-xs tracking-widest uppercase mb-4">Confidential Trading</p>
            <h1 className="text-4xl font-bold tracking-wide mb-6">Shield Mode</h1>
            <div className="h-px bg-[#222] mb-8" />

            <div className="p-6 border border-purple-500/30 bg-purple-500/5 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🛡</span>
                <div>
                  <h3 className="text-xl font-bold text-white">ZK-Shielded Swaps</h3>
                  <p className="text-purple-400 text-sm">Powered by PrivacyCash</p>
                </div>
              </div>
              <p className="text-[#a0a0a0] text-sm">
                Shield Mode deposits your swap output into a PrivacyCash privacy pool. When you withdraw,
                a zero-knowledge proof verifies you have the right to claim funds without revealing which
                deposit is yours. The on-chain link between your deposit and withdrawal is cryptographically broken.
              </p>
            </div>

            <h3 className="text-xl font-bold mb-4">How It Works</h3>
            <div className="space-y-4 mb-8">
              {[
                { step: "1", title: "Swap", desc: "Execute a standard swap via Jupiter (e.g., USDC → SOL). The swap output lands in your wallet." },
                { step: "2", title: "Shield", desc: "The output is automatically deposited into the PrivacyCash privacy pool. A WASM circuit generates an encrypted UTXO commitment on-chain." },
                { step: "3", title: "Withdraw", desc: "When ready, withdraw to any wallet address. A groth16 ZK proof is generated locally in your browser — proving you own the funds without revealing which deposit is yours." },
              ].map((s) => (
                <div key={s.step} className="p-4 border border-[#222] flex gap-4">
                  <span className="w-8 h-8 bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">{s.step}</span>
                  <div>
                    <h4 className="text-white font-bold mb-1">{s.title}</h4>
                    <p className="text-[#666] text-sm">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-bold mb-4">Why Privacy Matters</h3>
            <div className="space-y-4 mb-8">
              <div className="p-4 border border-[#222]">
                <h4 className="text-white font-bold mb-2">MEV Protection</h4>
                <p className="text-[#666] text-sm">Public transactions can be front-run by bots that see your order before it executes. Shielding hides your intent, preventing sandwich attacks.</p>
              </div>
              <div className="p-4 border border-[#222]">
                <h4 className="text-white font-bold mb-2">Institutional Confidentiality</h4>
                <p className="text-[#666] text-sm">Large traders cannot afford to broadcast their positions. Shield Mode enables dark-pool style trading where strategy remains hidden.</p>
              </div>
              <div className="p-4 border border-[#222]">
                <h4 className="text-white font-bold mb-2">Transaction Unlinkability</h4>
                <p className="text-[#666] text-sm">The zero-knowledge proof ensures there is no on-chain connection between your deposit and withdrawal. Your financial activity remains private.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 border border-[#222]">
                <div className="text-[#666] text-xs tracking-widest uppercase mb-2">Standard Swap</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#a0a0a0]">Output</span><span className="text-white">Direct to wallet</span></div>
                  <div className="flex justify-between"><span className="text-[#a0a0a0]">On-chain trail</span><span className="text-yellow-400">Fully visible</span></div>
                  <div className="flex justify-between"><span className="text-[#a0a0a0]">Fee</span><span className="text-white">0.5%</span></div>
                </div>
              </div>
              <div className="p-5 border border-purple-500/30 bg-purple-500/5">
                <div className="text-purple-400 text-xs tracking-widest uppercase mb-2">Shield Swap</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#a0a0a0]">Output</span><span className="text-purple-400">Privacy pool</span></div>
                  <div className="flex justify-between"><span className="text-[#a0a0a0]">On-chain trail</span><span className="text-green-400">Broken via ZKP</span></div>
                  <div className="flex justify-between"><span className="text-[#a0a0a0]">Fee</span><span className="text-white">0.75%</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* Yield */}
          <section id="yield" className="mb-20 scroll-mt-24">
            <p className="text-[#666] text-xs tracking-widest uppercase mb-4">Strategies</p>
            <h1 className="text-4xl font-bold tracking-wide mb-6">Earning Yield</h1>
            <div className="h-px bg-[#222] mb-8" />

            <p className="text-[#a0a0a0] leading-relaxed mb-8">
              Assets sitting idle earn <span className="text-white">0%</span>. Tokenized assets on Solana
              can be put to work. Here are the main strategies, ranked by risk.
            </p>

            {[
              { title: "Lending", risk: "Lowest Risk", riskColor: "green", apy: "~3-5% APY", desc: "Deposit into a lending protocol. Borrowers pay interest, you earn yield. Your principal stays denominated in the original asset — no impermanent loss.", il: false, protocols: "Kamino, Solend, MarginFi" },
              { title: "Staking", risk: "Low Risk", riskColor: "blue", apy: "~4-6% APY", desc: "Lock assets to secure a protocol or network. May have unlock periods. No impermanent loss but reduced liquidity.", il: false, protocols: "Sanctum, Jito" },
              { title: "Liquidity Providing (LP)", risk: "Medium Risk", riskColor: "yellow", apy: "~8-15% APY", desc: "Provide liquidity to trading pairs. You earn fees but face impermanent loss if prices diverge significantly.", il: true, protocols: "Orca, Meteora, Raydium" },
            ].map((y) => (
              <div key={y.title} className="mb-6 p-6 border border-[#222]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">{y.title}</h3>
                    <span className={`text-xs px-2 py-1 bg-${y.riskColor}-500/20 text-${y.riskColor}-400 border border-${y.riskColor}-500/30`}>{y.risk}</span>
                  </div>
                  <span className="text-[#666] text-sm">{y.apy}</span>
                </div>
                <p className="text-[#666] text-sm mb-4">{y.desc}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className={`flex items-center gap-2 ${y.il ? "text-yellow-400" : "text-green-400"}`}>
                    <span className={`w-2 h-2 rounded-full ${y.il ? "bg-yellow-400" : "bg-green-400"}`} /> {y.il ? "IL exposure" : "No IL risk"}
                  </span>
                  <span className="text-[#444]">Protocols: {y.protocols}</span>
                </div>
              </div>
            ))}

            <div className="p-4 border border-[#222]">
              <p className="text-[#666] text-sm">
                <span className="text-white font-bold">What is Impermanent Loss?</span> When you provide liquidity,
                if one asset&apos;s price changes relative to the other, you may end up with less total value
                than simply holding. The loss is &quot;impermanent&quot; because it reverses if prices return to the original ratio.
              </p>
            </div>
          </section>

          {/* Fees */}
          <section id="fees" className="mb-20 scroll-mt-24">
            <p className="text-[#666] text-xs tracking-widest uppercase mb-4">Transparency</p>
            <h1 className="text-4xl font-bold tracking-wide mb-6">Fees</h1>
            <div className="h-px bg-[#222] mb-8" />

            <div className="border border-[#222] overflow-hidden mb-8">
              <div className="grid grid-cols-3 gap-4 px-6 py-3 border-b border-[#222] text-xs text-[#666] tracking-widest uppercase">
                <div>Action</div>
                <div className="text-right">Fee</div>
                <div className="text-right">Notes</div>
              </div>
              {[
                { action: "Standard Swap", fee: "0.5%", notes: "Applied to output amount" },
                { action: "Shield Swap", fee: "0.75%", notes: "Includes ZK proof generation" },
                { action: "Shield Withdraw", fee: "0%", notes: "Only network gas fees" },
                { action: "Yield Discovery", fee: "0%", notes: "Affiliate referrals only" },
              ].map((item, i) => (
                <div key={i} className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-[#222] last:border-b-0">
                  <div className="text-white">{item.action}</div>
                  <div className="text-right font-mono text-white">{item.fee}</div>
                  <div className="text-right text-[#666] text-sm">{item.notes}</div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="p-4 border border-[#222]">
                <p className="text-[#666] text-sm">
                  <span className="text-white font-bold">Yield Affiliates:</span> We earn referral fees from DeFi protocols
                  when you deposit through Solis. This does not affect your APY — you get the same rate as going direct.
                  We disclose all affiliate relationships.
                </p>
              </div>
              <div className="p-4 border border-[#222]">
                <p className="text-[#666] text-sm">
                  <span className="text-white font-bold">Jupiter Routing:</span> Solis uses Jupiter for swap execution.
                  Platform fees are applied via Jupiter&apos;s platformFeeBps parameter. You always receive
                  the best available price minus the disclosed fee.
                </p>
              </div>
            </div>
          </section>

          {/* Roadmap */}
          <section id="roadmap" className="mb-20 scroll-mt-24">
            <p className="text-[#666] text-xs tracking-widest uppercase mb-4">What&apos;s Next</p>
            <h1 className="text-4xl font-bold tracking-wide mb-6">Roadmap</h1>
            <div className="h-px bg-[#222] mb-8" />

            <div className="space-y-6">
              {[
                { phase: "V1 — Capital Markets", status: "live", items: [
                  "14 tokenized assets (6 BTC wrappers + 7 stablecoins + SOL)",
                  "Jupiter swap integration with fee collection",
                  "Shield Mode via PrivacyCash (ZK deposit + withdraw)",
                  "Asset pages with holders, history, and metadata",
                  "Live market ticker, Fear & Greed, dominance metrics",
                ]},
                { phase: "V2 — Bitcoin Bridge", status: "building", items: [
                  "Native BTC → zBTC bridging via Zeus BitcoinKit",
                  "Free bridging as user acquisition (monetize on post-bridge swaps)",
                  "Real yield protocol integrations with referral tracking",
                  "Additional privacy features (Lightn Protocol)",
                ]},
                { phase: "V3 — Expansion", status: "planned", items: [
                  "Tokenized stocks (AAPL, TSLA, SPY)",
                  "Metals & commodities (Gold, Silver, Oil)",
                  "Portfolio tracking and price alerts",
                  "Advanced charting",
                ]},
                { phase: "V4 — Access", status: "planned", items: [
                  "Tokenized real estate",
                  "Fiat on-ramp integration",
                  "Mobile app",
                  "Institutional compliance tools",
                ]},
              ].map((phase) => (
                <div key={phase.phase} className={`p-6 border ${
                  phase.status === "live" ? "border-green-500/30 bg-green-500/5" :
                  phase.status === "building" ? "border-purple-500/30 bg-purple-500/5" :
                  "border-[#222]"
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-xl font-bold">{phase.phase}</h3>
                    <span className={`text-xs px-2 py-1 tracking-wider uppercase ${
                      phase.status === "live" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                      phase.status === "building" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                      "bg-[#111] text-[#666] border border-[#222]"
                    }`}>{phase.status === "live" ? "Live" : phase.status === "building" ? "Building" : "Planned"}</span>
                  </div>
                  <div className="space-y-2">
                    {phase.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-[#a0a0a0] text-sm">
                        <span className={
                          phase.status === "live" ? "text-green-400" :
                          phase.status === "building" ? "text-purple-400" :
                          "text-[#444]"
                        }>{phase.status === "live" ? "✓" : phase.status === "building" ? "◐" : "○"}</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Risks */}
          <section id="risks" className="mb-20 scroll-mt-24">
            <p className="text-[#666] text-xs tracking-widest uppercase mb-4">Disclosures</p>
            <h1 className="text-4xl font-bold tracking-wide mb-6">Risks</h1>
            <div className="h-px bg-[#222] mb-8" />

            <div className="space-y-4 mb-8">
              {[
                { title: "Smart Contract Risk", desc: "Tokenized assets and DeFi protocols rely on smart contracts. Bugs or exploits can result in loss of funds. Only use audited protocols." },
                { title: "Custody Risk", desc: "Centralized wrappers require trusting the custodian. If the custodian is compromised, underlying assets could be at risk." },
                { title: "Peg Risk", desc: "While wrappers maintain backing, market prices can temporarily deviate during volatility or liquidity crunches." },
                { title: "Privacy Technology Risk", desc: "Zero-knowledge proof systems are cutting-edge. Bugs in cryptographic implementations could compromise privacy or funds." },
                { title: "Regulatory Risk", desc: "Regulations around tokenized assets and privacy protocols are evolving. Issuers may be subject to government actions." },
              ].map((r) => (
                <div key={r.title} className="p-4 border border-[#222]">
                  <h4 className="text-white font-bold mb-2">{r.title}</h4>
                  <p className="text-[#666] text-sm">{r.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-6 border border-red-500/30 bg-red-500/5">
              <h4 className="text-red-400 font-bold mb-2">Not Financial Advice</h4>
              <p className="text-[#a0a0a0] text-sm">
                Solis is an informational and trading tool. Nothing on this platform constitutes financial,
                investment, or legal advice. Always do your own research and consult professionals before
                making investment decisions. Past performance does not guarantee future results.
              </p>
            </div>
          </section>

          {/* Glossary */}
          <section id="glossary" className="mb-20 scroll-mt-24">
            <p className="text-[#666] text-xs tracking-widest uppercase mb-4">Reference</p>
            <h1 className="text-4xl font-bold tracking-wide mb-6">Glossary</h1>
            <div className="h-px bg-[#222] mb-8" />

            <div className="space-y-4">
              {GLOSSARY.map((item) => (
                <div key={item.term} className="p-4 border border-[#222]">
                  <h4 className="text-white font-bold mb-1">{item.term}</h4>
                  <p className="text-[#666] text-sm">{item.definition}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <div className="text-center py-12 border-t border-[#222]">
            <p className="text-[#666] mb-4">Ready to explore the Internet Capital Markets?</p>
            <Link href="/" className="inline-block px-8 py-3 bg-white text-black font-bold tracking-wider uppercase hover:bg-slate-200 transition-colors">
              Launch App →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
