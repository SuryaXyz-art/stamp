"use client";

import { Undo2 } from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { EmptyState } from "@/components/stamp/empty-state";
import { EnvelopeCard } from "@/components/stamp/envelope-card";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/use-now";
import { useStampTx } from "@/hooks/use-stamp-tx";
import { useMailbox, useOptimisticStamps, type StampItem } from "@/hooks/use-stampbox";
import { DEMO_INBOX } from "@/lib/config";
import { formatCountdown, formatUsdc } from "@/lib/format";

const TIMEOUT = 7 * 24 * 60 * 60;

function ReclaimButton({ item, now, onReclaim, busy }: { item: StampItem; now: number; onReclaim: () => void; busy: boolean }) {
  const remaining = item.sentAt + TIMEOUT - now;
  const ready = remaining <= 0;
  return (
    <>
      <Button size="sm" variant={ready ? "default" : "outline"} className="h-9 rounded-lg" disabled={!ready || busy} onClick={onReclaim}>
        <Undo2 aria-hidden="true" />
        {ready ? `Reclaim ${formatUsdc(item.amount)}` : "Reclaim"}
      </Button>
      {!ready && (
        <span className="text-xs text-muted-foreground tabular" aria-live="off">
          available in {formatCountdown(remaining)}
        </span>
      )}
    </>
  );
}

export function SentDashboard() {
  const { address } = useAccount();
  const { data, isLoading, isError, refetch } = useMailbox("outbox", address);
  const { run, busy } = useStampTx();
  const optimistic = useOptimisticStamps();
  const now = useNow();
  const items = data ?? [];
  const sum = (s: StampItem[]) => s.reduce((a, x) => a + x.amount, 0n);
  const pending = items.filter((s) => s.status === "pending");
  const returned = items.filter((s) => s.status === "refunded" || s.status === "reclaimed");
  const lost = items.filter((s) => s.status === "kept");

  async function reclaim(item: StampItem) {
    const rollback = optimistic([item.id], "reclaimed");
    try {
      await run({ functionName: "reclaim", args: [item.id], labels: { pending: `Reclaiming ${formatUsdc(item.amount)}`, success: "Stamp reclaimed ✓" } });
    } catch {
      rollback();
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="font-serif text-4xl sm:text-5xl">Sent</h1>
      <p className="mt-1 text-sm text-muted-foreground">Unanswered stamps can be reclaimed 7 days after sending.</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <StatCard label="Awaiting reply" value={formatUsdc(sum(pending))} loading={isLoading} />
        <StatCard label="Came back to you" value={formatUsdc(sum(returned))} tone="text-success" loading={isLoading} />
        <StatCard label="Kept as spam" value={formatUsdc(sum(lost))} tone="text-stamp-ink" loading={isLoading} />
      </div>

      <div className="mt-10 space-y-4">
        {isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        {isError && (
          <EmptyState
            title="Couldn't load your sent stamps"
            description="The Arc RPC didn't answer. This is usually temporary."
            action={<Button onClick={() => refetch()}>Try again</Button>}
          />
        )}
        {!isLoading && !isError && items.length === 0 && (
          <EmptyState
            title="No stamps sent yet"
            description="Message someone's Stamp link and your envelopes will show up here."
            action={
              DEMO_INBOX ? (
                <Button asChild>
                  <Link href={`/${DEMO_INBOX}`}>Send your first stamp</Link>
                </Button>
              ) : undefined
            }
          />
        )}
        {items.map((item) => (
          <EnvelopeCard
            key={item.id.toString()}
            id={item.id}
            counterparty={item.to}
            direction="to"
            amount={item.amount}
            sentAt={item.sentAt}
            status={item.status}
            message={item.message}
            reply={item.reply}
            actions={item.status === "pending" ? <ReclaimButton item={item} now={now} busy={busy} onReclaim={() => reclaim(item)} /> : undefined}
          />
        ))}
      </div>
    </div>
  );
}
