"use client";

import { useStats } from "@/hooks/use-stampbox";
import { useNetwork } from "@/components/providers/network-provider";
import { formatUsdc } from "@/lib/format";

export function LiveStats() {
  const { data, isLoading } = useStats();
  const { chain } = useNetwork();
  const items = [
    { label: "Stamps sent", value: data ? data.count.toLocaleString("en-US") : undefined },
    { label: "Refunded to real people", value: data ? formatUsdc(data.refunded + data.reclaimed) : undefined, tone: "text-success" },
    { label: "Spam paid to receivers", value: data ? formatUsdc(data.kept) : undefined, tone: "text-stamp-ink" },
  ];
  return (
    <section aria-labelledby="stats-heading" className="mx-auto max-w-6xl px-4">
      <h2 id="stats-heading" className="sr-only">
        Live stats from {chain.name}
      </h2>
      <dl className="grid divide-y divide-border rounded-2xl border border-border bg-card shadow-[var(--shadow-paper)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {items.map((it) => (
          <div key={it.label} className="px-6 py-5">
            <dt className="text-sm text-muted-foreground">{it.label}</dt>
            <dd className={`mt-1 font-serif text-4xl tabular ${it.tone ?? ""}`}>
              {it.value ?? (isLoading ? <span className="inline-block h-9 w-24 animate-pulse rounded-lg bg-muted align-middle" /> : "—")}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex size-2" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
        Live from the StampBox contract on {chain.name}
      </p>
    </section>
  );
}
