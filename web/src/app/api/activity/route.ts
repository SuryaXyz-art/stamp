import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { chainEvents } from "@/lib/db/schema";
import { json, route } from "@/lib/server/api";

const query = z.object({ network: z.enum(["mainnet", "testnet"]) });

/** Latest StampBox activity from the Circle webhook index, for the landing page. No message text, no addresses. */
export const GET = route({ bucket: "read", needs: ["db"], body: query }, async ({ db, body }) => {
  const rows = await db
    .select()
    .from(chainEvents)
    .where(eq(chainEvents.network, body.network))
    .orderBy(desc(chainEvents.blockNumber), desc(chainEvents.kind))
    .limit(8);

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
    },
    { headers: { "cache-control": "public, s-maxage=10, stale-while-revalidate=30" } },
  );
});
