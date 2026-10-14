import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { stampBoxAbi } from "@/generated/stampBoxAbi";
import { getPublicClient } from "@/lib/clients";
import { getNetworkConfig } from "@/lib/config";
import { chainEvents } from "@/lib/db/schema";
import { json, route } from "@/lib/server/api";

const query = z.object({ network: z.enum(["mainnet", "testnet"]) });

const STATUS = ["pending", "refunded", "kept", "reclaimed"] as const;
const CACHE = { "cache-control": "public, s-maxage=10, stale-while-revalidate=30" };

/**
 * Fallback when the Circle webhook index is empty (Circle not connected yet, or a fresh database): the latest
 * stamps read straight from the contract. Same shape, no message text, no addresses.
 */
async function fromContract(network: "mainnet" | "testnet") {
  const net = getNetworkConfig(network);
  if (!net.stampBox) return [];
  const client = getPublicClient(network);
  const count = await client.readContract({ address: net.stampBox, abi: stampBoxAbi, functionName: "stampsCount" });
  const ids = Array.from({ length: Number(count < 8n ? count : 8n) }, (_, i) => count - 1n - BigInt(i));
  const stamps = await Promise.all(ids.map((id) => client.readContract({ address: net.stampBox!, abi: stampBoxAbi, functionName: "getStamp", args: [id] })));
  return stamps.map((s, i) => {
    const status = STATUS[Number(s.status)] ?? "pending";
    return {
      stampId: ids[i].toString(),
      kind: status === "pending" ? ("sent" as const) : ("settled" as const),
      status,
      amount: s.amount.toString(),
      txHash: null,
      at: new Date(Number(s.sentAt) * 1000).toISOString(),
    };
  });
}

/** Latest StampBox activity from the Circle webhook index, for the landing page. No message text, no addresses. */
export const GET = route({ bucket: "read", needs: ["db"], body: query }, async ({ db, body }) => {
  const rows = await db
    .select()
    .from(chainEvents)
    .where(eq(chainEvents.network, body.network))
    .orderBy(desc(chainEvents.blockNumber), desc(chainEvents.kind))
    .limit(8);

  if (!rows.length) return json({ events: await fromContract(body.network), source: "contract" }, { headers: CACHE });

  // Settled rows carry no amount; borrow it from the matching Sent row when we have it.
  const settledIds = rows.filter((r) => r.kind === "settled").map((r) => r.stampId);
  const sent = settledIds.length
    ? await db
        .select({ stampId: chainEvents.stampId, amount: chainEvents.amount })
        .from(chainEvents)
        .where(and(eq(chainEvents.network, body.network), eq(chainEvents.kind, "sent"), inArray(chainEvents.stampId, settledIds)))
    : [];
  const amountOf = new Map(sent.map((s) => [s.stampId, s.amount]));

  return json(
    {
      events: rows.map((r) => ({
        stampId: r.stampId,
        kind: r.kind,
        status: r.status,
        amount: r.amount ?? amountOf.get(r.stampId) ?? null,
        txHash: r.txHash,
        at: r.createdAt.toISOString(),
      })),
      source: "circle",
    },
    { headers: CACHE },
  );
});
