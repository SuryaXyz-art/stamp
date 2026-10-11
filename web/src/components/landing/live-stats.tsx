"use client";

import { usePublicStats } from "@/hooks/use-public-chain";
import { useNetwork } from "@/components/providers/network-provider";
import { formatUsdc } from "@/lib/format";

export function LiveStats() {
  const { data, isLoading } = usePublicStats();
  const { chain } = useNetwork();
  const items = [
    { label: "Stamps sent", value: data ? data.count.toLocaleString("en-US") : undefined, tone: "text-cyan-ink" },
    { label: "Refunded to real people", value: data ? formatUsdc(data.refunded + data.reclaimed) : undefined, tone: "text-lime-ink" },
    { label: "Spam paid to receivers", value: data ? formatUsdc(data.kept) : undefined, tone: "text-magenta-ink" },
  ];
  return (
    <section aria-labelledby="stats-heading" className="mx-auto max-w-6xl px-4">
      <h2 id="stats-heading" className="sr-only">
        Live stats from {chain.name}
      </h2>
      <dl className="panel grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {items.map((it) => (
          <div key={it.label} className="px-6 py-5">
            <dt className="kicker text-muted-foreground">{it.label}</dt>
            <dd className={`neon-text-glow mt-2 font-mono text-4xl font-medium tracking-tight tabular-nums ${it.tone ?? ""}`}>
              {it.value ?? (isLoading ? <span className="inline-block h-9 w-24 animate-pulse rounded-md bg-muted align-middle" /> : "—")}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
        <span className="relative flex size-2" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-lime shadow-[0_0_8px_var(--lime)]" />
        </span>
        Live from the StampBox contract on {chain.name}
      </p>
    </section>
  );
}
