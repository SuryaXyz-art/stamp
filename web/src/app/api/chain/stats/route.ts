import { z } from "zod";
import { stampBoxAbi } from "@/generated/stampBoxAbi";
import { json, route } from "@/lib/server/api";
import { getPublicClient } from "@/lib/clients";
import { getNetworkConfig } from "@/lib/config";

/**
 * Contract-wide totals for the landing page. Read on the server so the landing page ships no chain library;
 * cached for 15 seconds at the edge. Amounts are wei strings (bigint isn't JSON).
 */
export const GET = route({ bucket: "read", body: z.object({ network: z.enum(["mainnet", "testnet"]) }) }, async ({ body }) => {
  const net = getNetworkConfig(body.network);
  if (!net.stampBox) return json({ deployed: false });
  const client = getPublicClient(body.network);
  const read = (functionName: "stampsCount" | "totalRefunded" | "totalKept" | "totalReclaimed") =>
    client.readContract({ address: net.stampBox!, abi: stampBoxAbi, functionName });
  const [count, refunded, kept, reclaimed] = await Promise.all([read("stampsCount"), read("totalRefunded"), read("totalKept"), read("totalReclaimed")]);
  return json(
    { deployed: true, count: count.toString(), refunded: refunded.toString(), kept: kept.toString(), reclaimed: reclaimed.toString() },
    { headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=60" } },
  );
});
