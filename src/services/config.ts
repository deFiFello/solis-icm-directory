// @ts-nocheck
// Token Mint Addresses - VERIFIED WORKING
export const BTC_MINTS = {
  cbBTC: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij", // CORRECT - has DexScreener data
  WBTC: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
  zBTC: "zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg", // CORRECT - has DexScreener data
  tBTC: "6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU",
  xBTC: "CtzPWv73Sn1dMGVU3ZtLv9yWSyUAanBni19YWDaznnkn",
  LBTC: "LBTCgU4b3wsFKsPwBn1rRZDx5DoFutM6RPiEt1TPDsY",
} as const;

export const COMMON_MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
} as const;

export const EXTENDED_MINTS = {
  PYUSD: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
  USD1: "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB",
  CASH: "CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH",  // Correct mint from Helius
  hyUSD: "5YMkXAYccHSGnHn9nob9xEvv6Pvka9DZWH7nTbotTu9E", // Correct mint from Helius
} as const;

// Asset Configuration
export const SOLIS_ASSETS = [
  // BTC Wrappers (6)
  { symbol: 'cbBTC', name: 'Coinbase Wrapped BTC', mint: BTC_MINTS.cbBTC, decimals: 8, category: 'btc', logoURI: 'https://assets.coingecko.com/coins/images/26115/large/cbBTC.png' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', mint: BTC_MINTS.WBTC, decimals: 8, category: 'btc', logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh/logo.png' },
  { symbol: 'zBTC', name: 'Zeus Network BTC', mint: BTC_MINTS.zBTC, decimals: 8, category: 'btc', logoURI: 'https://zeusnetwork.xyz/static/media/zeus-logo.png' },
  { symbol: 'tBTC', name: 'Threshold BTC', mint: BTC_MINTS.tBTC, decimals: 8, category: 'btc', logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU/logo.png' },
  { symbol: 'xBTC', name: 'OKX Wrapped BTC', mint: BTC_MINTS.xBTC, decimals: 8, category: 'btc', logoURI: 'https://static.coinall.ltd/cdn/oksupport/common/20250512-095503.72e1f41d9b9a06.png' },
  { symbol: 'LBTC', name: 'Lombard Staked BTC', mint: BTC_MINTS.LBTC, decimals: 8, category: 'btc', logoURI: 'https://assets.coingecko.com/coins/images/39412/large/LBTC.jpg' },
  
  // Base Layer (1)
  { symbol: 'SOL', name: 'Solana', mint: COMMON_MINTS.SOL, decimals: 9, category: 'crypto', logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png' },
  
  // Stablecoins (6)
  { symbol: 'USDC', name: 'USD Coin', mint: COMMON_MINTS.USDC, decimals: 6, category: 'stable', logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' },
  { symbol: 'USDT', name: 'Tether USD', mint: COMMON_MINTS.USDT, decimals: 6, category: 'stable', logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg' },
  { symbol: 'PYUSD', name: 'PayPal USD', mint: EXTENDED_MINTS.PYUSD, decimals: 6, category: 'stable', logoURI: 'https://assets.coingecko.com/coins/images/31212/large/PYUSD_Logo_%282%29.png' },
  { symbol: 'USD1', name: 'World Liberty Financial USD', mint: EXTENDED_MINTS.USD1, decimals: 6, category: 'stable', logoURI: 'https://assets.coingecko.com/coins/images/47985/large/200x200.png' },
  { symbol: 'CASH', name: 'CASH', mint: EXTENDED_MINTS.CASH, decimals: 6, category: 'stable', logoURI: 'https://token-metadata.bridge.xyz/solana/cash.json' },
  { symbol: 'hyUSD', name: 'Hylo USD', mint: EXTENDED_MINTS.hyUSD, decimals: 6, category: 'stable', logoURI: 'https://hylo-token-metadata.s3.us-east-2.amazonaws.com/hyUSD/metadata.json' },
] as const;

// SOLIS_CONFIG
export const SOLIS_CONFIG = {
  JUPITER_API_KEY: "8b7d0011-2e6b-47b6-a597-2e2e36100f47",
  HELIUS_API_KEY: "ee6c2238-42f8-4582-b9e5-3180f450b998",
  HELIUS_RPC_URL: "https://mainnet.helius-rpc.com/?api-key=ee6c2238-42f8-4582-b9e5-3180f450b998",
  DEXSCREENER_API_URL: "https://api.dexscreener.com/latest/dex",
  JUPITER_PRICE_API_V6: "https://api.jup.ag/price/v2",
  JUPITER_QUOTE_API: "https://api.jup.ag/swap/v1/quote",
  PYTH_PRICE_SERVICE: "https://hermes.pyth.network/v2/updates/price/latest",
} as const;

// Legacy exports
export const API_KEYS = {
  JUPITER: SOLIS_CONFIG.JUPITER_API_KEY,
  HELIUS: SOLIS_CONFIG.HELIUS_API_KEY,
} as const;

export const RPC_ENDPOINTS = {
  HELIUS: SOLIS_CONFIG.HELIUS_RPC_URL,
  PUBLIC: "https://api.mainnet-beta.solana.com",
} as const;