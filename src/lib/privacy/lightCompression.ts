/**
 * LIGHT PROTOCOL / ZK COMPRESSION
 * Fetches compressed assets for Solis privacy features
 */

const HELIUS_KEY = "ee6c2238-42f8-4582-b9e5-3180f450b998";
const HELIUS_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;

export async function getCompressedAssets(ownerAddress: string) {
  const response = await fetch(HELIUS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "solis-compression-check",
      method: "getCompressedAccountsByOwner",
      params: { owner: ownerAddress }
    }),
  });

  const { result } = await response.json();
  
  // Returns the compressed items or an empty list if none found
  return result?.value?.items || [];
}

export async function getCompressedTokenBalances(ownerAddress: string) {
  const response = await fetch(HELIUS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "solis-balance-check",
      method: "getCompressedTokenBalancesByOwner",
      params: { owner: ownerAddress }
    }),
  });

  const { result } = await response.json();
  return result?.value?.items || [];
}
