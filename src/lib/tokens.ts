// @ts-nocheck
export interface BTCWrapper {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  custodyModel: 'custodial' | 'mpc' | 'threshold' | 'bridge';
  securityScore: number;
  issuer: string;
  bridgeTime: string;
  bridgeUrl: string;
  affiliateUrl?: string;
  logoUrl: string;
}

export const BTC_WRAPPERS: BTCWrapper[] = [
  {
    symbol: 'zBTC',
    name: 'Zeus Bitcoin',
    mint: 'zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg',
    decimals: 8,
    custodyModel: 'mpc',
    securityScore: 92,
    issuer: 'Zeus Network',
    bridgeTime: '~20 min',
    bridgeUrl: 'https://apollo.zeusnetwork.io',
    logoUrl: '/tokens/zbtc.svg',
  },
  {
    symbol: 'cbBTC',
    name: 'Coinbase BTC',
    mint: 'cbBTCcLq2jYWQXg3uy1bqMR5kyuEJ6e7LSwTSoJFYmm',
    decimals: 8,
    custodyModel: 'custodial',
    securityScore: 78,
    issuer: 'Coinbase',
    bridgeTime: 'Instant',
    bridgeUrl: 'https://www.coinbase.com',
    affiliateUrl: 'https://coinbase.com/join/',
    logoUrl: '/tokens/cbbtc.svg',
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    mint: '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
    decimals: 8,
    custodyModel: 'custodial',
    securityScore: 75,
    issuer: 'BitGo',
    bridgeTime: '5-30 min',
    bridgeUrl: 'https://wormhole.com',
    logoUrl: '/tokens/wbtc.svg',
  },
  {
    symbol: 'tBTC',
    name: 'Threshold BTC',
    mint: '6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU',
    decimals: 8,
    custodyModel: 'threshold',
    securityScore: 85,
    issuer: 'Threshold Network',
    bridgeTime: '10-60 min',
    bridgeUrl: 'https://threshold.network',
    logoUrl: '/tokens/tbtc.svg',
  },
];

export const POPULAR_TOKENS = [
  {
    symbol: 'SOL',
    name: 'Solana',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    logoUrl: '/tokens/sol.svg',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    logoUrl: '/tokens/usdc.svg',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
    logoUrl: '/tokens/usdt.svg',
  },
];

export const ALL_TOKENS = [...BTC_WRAPPERS, ...POPULAR_TOKENS];

export function isBTCWrapper(mint: string): boolean {
  return BTC_WRAPPERS.some(w => w.mint === mint);
}

export function getBTCWrapper(mint: string): BTCWrapper | undefined {
  return BTC_WRAPPERS.find(w => w.mint === mint);
}

export function getToken(mint: string) {
  return ALL_TOKENS.find(t => t.mint === mint);
}
