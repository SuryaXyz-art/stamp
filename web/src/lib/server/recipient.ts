import "server-only";
import { getAddress, isAddress, type Address } from "viem";
import { stampBoxAbi } from "@/generated/stampBoxAbi";
import type { NetworkKey } from "@/lib/chains";
import { getPublicClient } from "@/lib/clients";
import { getNetworkConfig } from "@/lib/config";
import { profileByAddress, profileByHandle } from "./profiles";

/** Public lookups shared by the agent API and the badge: "who is this" and "what does their inbox charge". */

export type Recipient = { address: Address; handle: string | null; displayName: string | null };

/** `0x…` address, `handle` or `@handle` → recipient. Null when a handle doesn't exist. */
export async function resolveRecipient(raw: string): Promise<Recipient | null> {
  const id = decodeURIComponent(raw).trim();
  if (isAddress(id, { strict: false })) {
    const address = getAddress(id);
    const profile = await profileByAddress(address);
    return { address, handle: profile?.handle ?? null, displayName: profile?.displayName || null };
  }
  const profile = await profileByHandle(id.replace(/^@/, ""));
  if (!profile) return null;
  return { address: getAddress(profile.address), handle: profile.handle, displayName: profile.displayName || null };
}

export type InboxState = { deployed: false } | { deployed: true; price: bigint; bio: string; open: boolean };

export async function readInbox(network: NetworkKey, address: Address): Promise<InboxState> {
  const net = getNetworkConfig(network);
  if (!net.stampBox) return { deployed: false };
  const client = getPublicClient(network);
  const [price, bio] = await Promise.all([
    client.readContract({ address: net.stampBox, abi: stampBoxAbi, functionName: "priceOf", args: [address] }),
    client.readContract({ address: net.stampBox, abi: stampBoxAbi, functionName: "bioOf", args: [address] }),
  ]);
  return { deployed: true, price, bio, open: price > 0n };
}
