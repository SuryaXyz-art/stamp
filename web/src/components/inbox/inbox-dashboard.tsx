"use client";

import { Keyboard, Settings2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { OwedBanner } from "@/components/owed-banner";
import { EmptyState } from "@/components/stamp/empty-state";
import { MoneyBurst } from "@/components/stamp/money-burst";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadOlder } from "@/components/stamp/load-older";
import { useStampTx } from "@/hooks/use-stamp-tx";
import { MAILBOX_PAGE, useInboxInfo, useMailbox, useMailboxCount, useOptimisticStamps, type StampItem } from "@/hooks/use-stampbox";
import { formatStampPrice, formatUsdc } from "@/lib/format";
import { InboxItem } from "./inbox-item";
import { InboxSettings } from "./inbox-settings";
import { ShortcutsDialog } from "./shortcuts-dialog";

type Tab = "pending" | "refunded" | "kept" | "reclaimed" | "all";
const TABS: Tab[] = ["pending", "refunded", "kept", "reclaimed", "all"];

const sum = (items: StampItem[]) => items.reduce((a, s) => a + s.amount, 0n);

export function InboxDashboard() {
  const { address } = useAccount();
  const [limit, setLimit] = useState(MAILBOX_PAGE);
  const { data: items, isLoading, isError, isPlaceholderData, refetch } = useMailbox("inbox", address, limit);
  const { data: total } = useMailboxCount("inbox", address);
  const { data: info } = useInboxInfo(address);
  const optimistic = useOptimisticStamps();
  const { run, busy } = useStampTx();

  const [tab, setTab] = useState<Tab>("pending");
  const [selected, setSelected] = useState<Set<bigint>>(new Set());
  const [focus, setFocus] = useState(0);
  const [replyingTo, setReplyingTo] = useState<bigint | null>(null);
  const [celebrate, setCelebrate] = useState<bigint | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const all = useMemo(() => items ?? [], [items]);
  const groups = useMemo(
    () => ({
      pending: all.filter((s) => s.status === "pending"),
      refunded: all.filter((s) => s.status === "refunded"),
      kept: all.filter((s) => s.status === "kept"),
      reclaimed: all.filter((s) => s.status === "reclaimed"),
      all,
    }),
    [all],
  );
  const visible = groups[tab];
  const focusedItem = visible[Math.min(focus, visible.length - 1)];

  const settle = useCallback(
    async (ids: bigint[], kind: "refund" | "keep", reply = "") => {
      if (!ids.length) return;
      const amount = sum(all.filter((s) => ids.includes(s.id)));
      const rollback = optimistic(ids, kind === "refund" ? "refunded" : "kept");
      setSelected(new Set());
      setReplyingTo(null);
      try {
        if (kind === "refund") {
          await run(
            ids.length === 1
              ? { functionName: "refund", args: [ids[0], reply], labels: { pending: `Refunding ${formatUsdc(amount)}`, success: "Replied & refunded ✓" } }
              : { functionName: "batchRefund", args: [ids], labels: { pending: `Refunding ${ids.length} stamps`, success: `${ids.length} stamps refunded ✓` } },
          );
          setCelebrate(ids[0]);
          setTimeout(() => setCelebrate(null), 1200);
        } else {
          await run(
            ids.length === 1
              ? { functionName: "keep", args: [ids[0]], labels: { pending: `Keeping ${formatUsdc(amount)}`, success: `Spam filed. ${formatUsdc(amount)} is yours ✓` } }
              : { functionName: "batchKeep", args: [ids], labels: { pending: `Keeping ${ids.length} stamps`, success: `${formatUsdc(amount)} from spam is yours ✓` } },
          );
        }
      } catch {
        rollback();
      }
    },
    [all, optimistic, run],
  );

  // Keyboard: J/K move, X select, R reply & refund, S spam, Esc closes the reply box, ? shows help.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest("input, textarea, [contenteditable], [role=dialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      } else if (key === "j" || key === "arrowdown") {
        e.preventDefault();
        setFocus((f) => Math.min(f + 1, visible.length - 1));
      } else if (key === "k" || key === "arrowup") {
        e.preventDefault();
        setFocus((f) => Math.max(f - 1, 0));
      } else if (!focusedItem || focusedItem.status !== "pending" || busy) {
        return;
      } else if (key === "r") {
        e.preventDefault();
        setReplyingTo(focusedItem.id);
      } else if (key === "s") {
        e.preventDefault();
        settle([focusedItem.id], "keep");
      } else if (key === "x") {
        e.preventDefault();
        setSelected((s) => {
          const n = new Set(s);
          if (n.has(focusedItem.id)) n.delete(focusedItem.id);
          else n.add(focusedItem.id);
          return n;
        });
      } else if (key === "escape") {
        setReplyingTo(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible.length, focusedItem, settle, busy]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${focus}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focus]);

  const selectedIds = [...selected].filter((id) => groups.pending.some((s) => s.id === id));
  const allPendingSelected = groups.pending.length > 0 && selectedIds.length === groups.pending.length;

  if (!isLoading && !isError && all.length === 0 && info && !info.open) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title="You haven't opened an inbox yet"
          description="Pick a price, share your link, and strangers can reach you with a refundable stamp."
          action={
            <Button asChild>
              <Link href="/setup">Open my inbox</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl">Inbox</h1>
          {info?.open ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Open at <span className="font-medium text-foreground">{formatStampPrice(info.price)}</span> per stamp ·{" "}
              <Link href={`/${address}`} className="underline underline-offset-4 hover:text-foreground">
                your public page
              </Link>
            </p>
          ) : info ? (
            <p className="mt-1 text-sm text-amber">Closed: not accepting new stamps.</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Keyboard shortcuts"
            aria-keyshortcuts="Shift+?"
            className="hidden sm:inline-flex"
            onClick={() => setHelpOpen(true)}
          >
            <Keyboard aria-hidden="true" />
          </Button>
          <Button variant="outline" onClick={() => setSettingsOpen(true)} className="rounded-xl">
            <Settings2 aria-hidden="true" /> Settings
          </Button>
        </div>
      </div>

      <OwedBanner />

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <StatCard label="Pending" value={formatUsdc(sum(groups.pending))} loading={isLoading} />
        <StatCard label="Earned from spam" value={formatUsdc(sum(groups.kept))} tone="text-stamp-ink" loading={isLoading} />
        <div className="relative">
          {celebrate !== null && <MoneyBurst />}
          <StatCard label="Refunded" value={formatUsdc(sum(groups.refunded))} tone="text-success" loading={isLoading} />
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as Tab);
          setFocus(0);
        }}
        className="mt-10"
      >
        <TabsList className="h-10 w-full rounded-xl bg-muted p-1 sm:w-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-lg px-3 capitalize data-[state=active]:bg-card">
              {t} <span className="text-xs text-muted-foreground tabular">{groups[t].length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "pending" && groups.pending.length > 0 && (
        <div className="sticky top-0 z-20 -mx-4 mt-4 flex flex-wrap items-center gap-3 bg-background/90 px-4 py-2 backdrop-blur">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={allPendingSelected}
              onCheckedChange={(c) => setSelected(c ? new Set(groups.pending.map((s) => s.id)) : new Set())}
              aria-label="Select all pending"
            />
            {selectedIds.length ? `${selectedIds.length} selected` : "Select all"}
          </label>
          {selectedIds.length > 0 && (
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" className="rounded-lg" disabled={busy} onClick={() => settle(selectedIds, "refund")}>
                Refund {selectedIds.length}
              </Button>
              <Button size="sm" variant="destructive" className="rounded-lg" disabled={busy} onClick={() => settle(selectedIds, "keep")}>
                Spam: keep {formatUsdc(sum(groups.pending.filter((s) => selected.has(s.id))))}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Announce only the pending count, not every refetch of the whole list. */}
      <p className="sr-only" aria-live="polite">
        {items ? `${groups.pending.length} pending ${groups.pending.length === 1 ? "stamp" : "stamps"}` : ""}
      </p>

      <div ref={listRef} className="mt-4 space-y-4">
        {isLoading &&
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" aria-label="Loading message" />)}
        {isError && (
          <EmptyState
            title="Couldn't load your inbox"
            description="The Arc RPC didn't answer. This is usually temporary."
            action={<Button onClick={() => refetch()}>Try again</Button>}
          />
        )}
        {!isLoading && !isError && visible.length === 0 && (
          <EmptyState
            title={tab === "pending" ? "Inbox zero" : tab === "all" ? "No mail yet" : `Nothing ${tab} yet`}
            description={
              tab === "pending" || tab === "all" ? (
                <>
                  Share your link to start receiving stamped messages:{" "}
                  <Link href={`/${address}`} className="underline underline-offset-4">
                    your send page
                  </Link>
                  .
                </>
              ) : undefined
            }
          />
        )}
        {visible.map((item, i) => (
          <InboxItem
            key={item.id.toString()}
            index={i}
            item={item}
            focused={i === focus}
            selected={selected.has(item.id)}
            onSelect={(v) =>
              setSelected((s) => {
                const n = new Set(s);
                if (v) n.add(item.id);
                else n.delete(item.id);
                return n;
              })
            }
            replying={replyingTo === item.id}
            onReplyToggle={(v) => setReplyingTo(v ? item.id : null)}
            onRefund={(reply) => settle([item.id], "refund", reply)}
            onKeep={() => settle([item.id], "keep")}
            busy={busy}
            onFocus={() => setFocus(i)}
          />
        ))}
        {!isLoading && !isError && (
          <LoadOlder shown={all.length} total={total} loading={isPlaceholderData} onClick={() => setLimit((l) => l + MAILBOX_PAGE)} />
        )}
      </div>

      <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
      {info && <InboxSettings key={`${info.open}-${info.price}-${info.bio}`} open={settingsOpen} onOpenChange={setSettingsOpen} info={info} />}
    </div>
  );
}
