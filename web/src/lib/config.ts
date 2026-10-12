import type { Address } from "viem";
import { deployments } from "@/generated/deployments";
import { chainsByNetwork, type NetworkKey } from "./chains";

/**
 * Runtime configuration. Every value has a working default, so the app runs with zero env vars:
 * contract addresses come from contracts/deployments/*.json (generated into src/generated).
 */

/** Format check only (no checksum): keeps viem's hashing code out of every page that reads config. */
function envAddress(value: string | undefined): Address | undefined {
  return value && /^0x[0-9a-fA-F]{40}$/.test(value) ? (value as Address) : undefined;
}

function rpcOverride(value: string | undefined): string | undefined {
  return value && value.startsWith("http") ? value : undefined;
}

const overrides: Record<NetworkKey, { address?: Address; startBlock?: number; rpc?: string }> = {
  mainnet: {
    address: envAddress(process.env.NEXT_PUBLIC_STAMPBOX_MAINNET),
    startBlock: Number(process.env.NEXT_PUBLIC_STAMPBOX_MAINNET_START_BLOCK) || undefined,
    rpc: rpcOverride(process.env.NEXT_PUBLIC_ARC_MAINNET_RPC),
  },
  testnet: {
    address: envAddress(process.env.NEXT_PUBLIC_STAMPBOX_TESTNET),
    startBlock: Number(process.env.NEXT_PUBLIC_STAMPBOX_TESTNET_START_BLOCK) || undefined,
    rpc: rpcOverride(process.env.NEXT_PUBLIC_ARC_TESTNET_RPC),
  },
};

export type NetworkConfig = {
  key: NetworkKey;
  chain: (typeof chainsByNetwork)[NetworkKey];
  rpcUrl: string;
  /** undefined when StampBox isn't deployed on this network yet */
  stampBox?: Address;
  startBlock: bigint;
};

export function getNetworkConfig(key: NetworkKey): NetworkConfig {
  const chain = chainsByNetwork[key];
  const deployed = deployments[chain.id];
  return {
    key,
    chain,
    rpcUrl: overrides[key].rpc ?? chain.rpcUrls.default.http[0],
    stampBox: overrides[key].address ?? deployed?.address,
    startBlock: BigInt(overrides[key].startBlock ?? deployed?.startBlock ?? 0),
  };
}

/** Mainnet when StampBox is deployed there, otherwise testnet. Overridable via env. */
export const DEFAULT_NETWORK: NetworkKey =
  process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "testnet" || process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mainnet"
    ? process.env.NEXT_PUBLIC_DEFAULT_NETWORK
    : getNetworkConfig("mainnet").stampBox
      ? "mainnet"
      : "testnet";

/** The founder's always-open demo inbox ("Send me a stamp, I'll refund you"). */
const DEFAULT_DEMO_INBOX = "";
export const DEMO_INBOX: Address | undefined =
  envAddress(process.env.NEXT_PUBLIC_DEMO_INBOX) ?? envAddress(DEFAULT_DEMO_INBOX);

/** Optional: enables WalletConnect-based wallets (mobile QR, Rainbow, MetaMask mobile). */
export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

/** Public origin used in share links and OG images. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://stamp-arc.vercel.app").replace(/\/$/, "");

/** Public source repository (footer + README links). */
export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/SuryaXyz-art/stamp";

/** Privy app id (public). Without it, sign-in falls back to browser wallets only and account features stay off. */
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
