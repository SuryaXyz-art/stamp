import { z } from "zod";
import { stampBoxAbi } from "@/generated/stampBoxAbi";
import { json, route } from "@/lib/server/api";
import { getPublicClient } from "@/lib/clients";
import { getNetworkConfig } from "@/lib/config";

const query = z.object({
  network: z.enum(["mainnet", "testnet"]),
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid address."),
});

/** One inbox's on-chain price and headline, for pages that shouldn't load a chain library (landing). */
export const GET = route({ bucket: "read", body: query }, async ({ body }) => {
  const net = getNetworkConfig(body.network);
  if (!net.stampBox) return json({ deployed: false });
  const client = getPublicClient(body.network);
  const address = body.address as `0x${string}`;
  const [price, bio] = await Promise.all([
    client.readContract({ address: net.stampBox, abi: stampBoxAbi, functionName: "priceOf", args: [address] }),
    client.readContract({ address: net.stampBox, abi: stampBoxAbi, functionName: "bioOf", args: [address] }),
  ]);
  return json(
    { deployed: true, price: price.toString(), bio, open: price > 0n },
    { headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=60" } },
  );
});
