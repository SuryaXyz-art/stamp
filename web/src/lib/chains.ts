import { defineChain } from "viem";

/**
 * Arc networks. USDC is the native gas token with 18 decimals, so
 * `parseEther("1")` is exactly $1.00. We never touch the 6-decimal ERC-20 view.
 * Source: https://docs.arc.io/arc/references/connect-to-arc
 */
export const arcMainnet = defineChain({
  id: 5042,
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.arc.io"] } },
  blockExplorers: { default: { name: "Arc Explorer", url: "https://explorer.arc.io" } },
});

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  blockExplorers: { default: { name: "Arc Testnet Explorer", url: "https://explorer.testnet.arc.io" } },
  testnet: true,
});

export type NetworkKey = "mainnet" | "testnet";

export const chainsByNetwork = { mainnet: arcMainnet, testnet: arcTestnet } as const;

export const FAUCET_URL = "https://faucet.circle.com";
