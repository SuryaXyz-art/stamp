"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/copy-button";
import { useNetwork } from "@/components/providers/network-provider";
import { EmptyState } from "@/components/stamp/empty-state";
import { Identicon } from "@/components/stamp/identicon";
import { PostageStamp } from "@/components/stamp/postage-stamp";
import { Postmark, statusLabel } from "@/components/stamp/postmark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStampDetail } from "@/hooks/use-stampbox";
import { formatStampPrice, formatUsdc, shortAddress } from "@/lib/format";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular">{children}</dd>
    </div>
  );
}

/** Permalink receipt for one stamp. */
export function Receipt({ id }: { id: bigint }) {
  const { chain } = useNetwork();
  const { data: item, isLoading, isError, refetch } = useStampDetail(id);
  const explorer = chain.blockExplorers.default.url;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-12" aria-busy="true">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title="Couldn't reach Arc" description="Try again in a moment." action={<Button onClick={() => refetch()}>Try again</Button>} />
      </div>
    );
  }
  if (!item) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title={`Stamp #${id} doesn't exist`}
          description={`There's no stamp with this number on ${chain.name}. If it was sent on the other network, switch networks in the footer.`}
        />
      </div>
    );
  }

  const date = new Date(item.sentAt * 1000);
  const link = (hash?: string) =>
    hash ? (
      <a href={`${explorer}/tx/${hash}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-usdc-ink underline-offset-4 hover:underline">
        {shortAddress(hash, 6)} <ExternalLink className="size-3" aria-hidden="true" />
      </a>
    ) : (
      "—"
    );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-14">
      <p className="text-sm text-muted-foreground">Receipt</p>
      <h1 className="font-serif text-4xl sm:text-5xl">Stamp #{id.toString()}</h1>

      <article className="envelope mt-8 p-6 pt-8 sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <Identicon address={item.from} size={32} />
              <div>
                <p className="text-muted-foreground">From</p>
                <Link href={`/${item.from}`} className="font-medium tabular hover:underline">
                  {shortAddress(item.from)}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Identicon address={item.to} size={32} />
              <div>
                <p className="text-muted-foreground">To</p>
                <Link href={`/${item.to}`} className="font-medium tabular hover:underline">
                  {shortAddress(item.to)}
                </Link>
              </div>
            </div>
          </div>
          <div className="relative">
            <PostageStamp price={formatStampPrice(item.amount)} size="md" tilt={4} />
            <Postmark
              status={item.status}
              date={date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
              size={96}
              className="absolute -bottom-10 -left-14"
            />
          </div>
        </div>

        <div className="mt-10">
          {item.message === undefined ? (
            <Skeleton className="h-16 rounded-xl" />
          ) : (
            <p className="text-lg leading-relaxed break-words whitespace-pre-wrap">{item.message}</p>
          )}
          {item.reply && (
            <div className="mt-6 rounded-xl border border-success/25 bg-success/5 px-4 py-3">
              <p className="mb-1 text-xs font-medium text-success">Reply</p>
              <p className="break-words whitespace-pre-wrap">{item.reply}</p>
            </div>
          )}
        </div>
      </article>

      <dl className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card px-5 shadow-[var(--shadow-paper)]">
        <Row label="Status">{statusLabel[item.status]}</Row>
        <Row label="Amount">{formatUsdc(item.amount, { suffix: true })}</Row>
        <Row label="Sent">{date.toLocaleString()}</Row>
        <Row label="Network">{chain.name}</Row>
        <Row label="Send transaction">{link(item.sentTx)}</Row>
        {item.status !== "pending" && <Row label="Settlement transaction">{link(item.settledTx)}</Row>}
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <CopyButton value={typeof window !== "undefined" ? window.location.href : ""} label="Copy receipt link" />
        <Button asChild variant="ghost">
          <Link href={`/${item.to}`}>Message {shortAddress(item.to)}</Link>
        </Button>
      </div>
    </div>
  );
}
