"use client";

import Link from "next/link";
import { usePublicStats } from "@/hooks/use-public-chain";
import { useNetwork } from "@/components/providers/network-provider";
import { formatUsdc, shortAddress } from "@/lib/format";

export function LiveStats() {
  const { data, isLoading } = usePublicStats();
  const { chain, stampBox } = useNetwork();
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
      {data && data.count === 0n ? (
        <div className="panel flex flex-col items-start gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl font-bold uppercase">Stamp #1 on {chain.name} is still up for grabs</p>
            <p className="mt-1 text-sm text-muted-foreground">The contract is live and empty. Open an inbox or send the first stamp.</p>
          </div>
          <Link href="/onboarding" className="font-mono text-sm text-cyan-ink underline-offset-4 hover:underline">
            Open the first inbox →
          </Link>
        </div>
      ) : (
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
      )}
      <p className="mt-3 flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
        <span className="relative flex size-2" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-lime shadow-[0_0_8px_var(--lime)]" />
        </span>
        Live from the StampBox contract on {chain.name}
        {stampBox && (
          <a
            href={`${chain.blockExplorers.default.url}/address/${stampBox}`}
            target="_blank"
            rel="noopener"
            className="normal-case underline-offset-4 hover:text-foreground hover:underline"
          >
            {shortAddress(stampBox)} ↗
          </a>
        )}
      </p>
    </section>
  );
}
