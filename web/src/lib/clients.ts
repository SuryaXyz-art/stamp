import { createPublicClient, http, type PublicClient } from "viem";
import type { NetworkKey } from "./chains";
import { getNetworkConfig } from "./config";

/**
 * Read-only Arc clients, one per network, shared by the whole app. Plain viem, no wallet libraries, so pages
 * that only read the chain (landing, profiles, receipts) never load wagmi or the auth SDK.
 */
const clients = new Map<NetworkKey, PublicClient>();

export function getPublicClient(key: NetworkKey): PublicClient {
  let client = clients.get(key);
  if (!client) {
    const net = getNetworkConfig(key);
    // Individual reads ride one JSON-RPC batch, so there's no Multicall3 dependency.
    client = createPublicClient({ chain: net.chain, transport: http(net.rpcUrl, { batch: true }) }) as PublicClient;
    clients.set(key, client);
  }
  return client;
}
