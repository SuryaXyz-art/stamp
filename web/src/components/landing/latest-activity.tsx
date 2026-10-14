"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useNetwork } from "@/components/providers/network-provider";
import { formatUsdc, timeAgo } from "@/lib/format";

type Activity = { stampId: string; kind: "sent" | "settled"; status: "pending" | "refunded" | "kept" | "reclaimed"; amount: string | null; at: string };

const tone = { pending: "text-cyan-ink", refunded: "text-lime-ink", kept: "text-magenta-ink", reclaimed: "text-amber-ink" } as const;

function describe(a: Activity): string {
  const amount = a.amount ? formatUsdc(BigInt(a.amount)) : "the";
  if (a.kind === "sent") return `sent with a ${amount} stamp`;
  if (a.status === "refunded") return `answered, ${amount} refunded`;
  if (a.status === "kept") return `marked spam, ${amount} kept`;
  return `unanswered, ${amount} reclaimed`;
}

/**
 * Live feed from Circle's Contracts event monitors (signed webhooks → /api/activity), or read straight from the
 * contract until Circle has delivered anything. Hidden until there's data.
 */
export function LatestActivity() {
  const { key } = useNetwork();
  const { data } = useQuery({
    queryKey: ["activity", key],
    refetchInterval: 15_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/activity?network=${key}`);
      if (!res.ok) return { events: [] as Activity[], source: "contract" };
      return (await res.json()) as { events: Activity[]; source: "circle" | "contract" };
    },
  });
  if (!data?.events.length) return null;
  return (
    <div className="panel mt-4 px-6 py-5">
      <p className="kicker text-muted-foreground">Latest on Arc</p>
      <ul className="mt-3 divide-y divide-border">
        {data.events.map((a) => (
          <li key={`${a.stampId}-${a.kind}`} className="flex items-center justify-between gap-4 py-2.5 text-sm">
            <span className="min-w-0 truncate">
              <Link href={`/stamp/${a.stampId}`} className="font-mono text-foreground underline-offset-4 hover:underline">
                Stamp #{a.stampId}
              </Link>{" "}
              <span className={tone[a.status]}>{describe(a)}</span>
            </span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{timeAgo(Math.floor(Date.parse(a.at) / 1000))}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        {data.source === "circle" ? "Delivered by Circle Contracts event monitors." : "Read live from the StampBox contract on Arc."}
      </p>
    </div>
  );
}
