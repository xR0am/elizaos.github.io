/**
 * Chain ID mapping for currently supported chains based on CAIP-2 blockchain identifier
 * Mainnet chain IDs are used for the wallet linking process
 * @see https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md
 */
export const CHAIN_IDS = {
  ethereum: "eip155:1",
  solana: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
};

/**
 * Look up the CAIP-2 chain identifier for a given chain name
 * @param chain The name of the blockchain (e.g., "ethereum", "solana")
 * @returns The CAIP-2 chain identifier if found, empty string otherwise
 */
export function getChainId(chain: string): string {
  return CHAIN_IDS[chain.toLowerCase() as keyof typeof CHAIN_IDS] || "";
}

/**
 * Reverse lookup the chain name for a given CAIP-2 chain identifier
 * @param chainId The CAIP-2 chain identifier (e.g., "eip155:1", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")
 * @returns The chain if found, empty string otherwise
 */
export function getChainByChainId(chainId: string): string {
  const entries = Object.entries(CHAIN_IDS);
  const found = entries.find(([, id]) => id === chainId);
  return found ? found[0] : "";
}

/**
 * Creates a CAIP-10 account identifier from a chain ID and address
 * account_id: chain_id + ":" + account_address
 *
 * @param chainId The CAIP-2 chain identifier
 * @param address The account address on the specified chain
 * @returns A CAIP-10 compliant account identifier
 * @see https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md
 */
export function createAccountId(chainId: string, address: string): string {
  return `${chainId}:${address}`;
}
