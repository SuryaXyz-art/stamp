"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address, PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { useNetwork } from "@/components/providers/network-provider";
import { stampBoxAbi } from "@/generated/stampBoxAbi";
import { fetchSentLogs, fetchSettledLogs } from "@/lib/logs";
import { statusFromIndex, type StampStatus } from "@/components/stamp/postmark";

export type StampItem = {
  id: bigint;
  from: Address;
  to: Address;
  amount: bigint;
  sentAt: number;
  status: StampStatus;
  message?: string;
  sentTx?: `0x${string}`;
  reply?: string;
  settledTx?: `0x${string}`;
};

/** How many of the most recent stamps an inbox/outbox view loads. */
const PAGE = 200n;

export function useStampBox() {
  const net = useNetwork();
  const client = usePublicClient({ chainId: net.chain.id }) as PublicClient | undefined;
  return { ...net, client, address: net.stampBox, deployed: Boolean(net.stampBox) };
}

async function loadStamps(client: PublicClient, address: Address, startBlock: bigint, ids: bigint[]): Promise<StampItem[]> {
  if (!ids.length) return [];
  // Individual reads ride one JSON-RPC batch (see `http(..., { batch: true })`), so no Multicall3 dependency.
  const raw = await Promise.all(
    ids.map((id) => client.readContract({ address, abi: stampBoxAbi, functionName: "getStamp", args: [id] })),
  );
  const items: StampItem[] = raw.map((s, i) => ({
    id: ids[i],
    from: s.from,
    to: s.to,
    amount: s.amount,
    sentAt: Number(s.sentAt),
    status: statusFromIndex[s.status],
  }));
  const earliest = BigInt(Math.min(...items.map((s) => s.sentAt)));
  const ctx = { client, address, startBlock };
  const settledIds = items.filter((s) => s.status !== "pending").map((s) => s.id);
  const [sent, settled] = await Promise.all([
    fetchSentLogs(ctx, { ids }, earliest),
    fetchSettledLogs(ctx, settledIds, earliest),
  ]);
  const sentById = new Map(sent.map((l) => [l.id, l]));
  const settledById = new Map(settled.map((l) => [l.id, l]));
  return items.map((s) => ({
    ...s,
    message: sentById.get(s.id)?.message,
    sentTx: sentById.get(s.id)?.txHash,
    reply: settledById.get(s.id)?.reply || undefined,
    settledTx: settledById.get(s.id)?.txHash,
  }));
}

export function useMailbox(kind: "inbox" | "outbox", user: Address | undefined) {
  const { client, address, startBlock, key } = useStampBox();
  return useQuery({
    queryKey: ["mailbox", key, kind, user],
    enabled: Boolean(client && address && user),
    refetchInterval: 15_000,
    queryFn: async () => {
      const countFn = kind === "inbox" ? "inboxCount" : "outboxCount";
      const listFn = kind === "inbox" ? "inboxOf" : "outboxOf";
      const count = await client!.readContract({ address: address!, abi: stampBoxAbi, functionName: countFn, args: [user!] });
      const offset = count > PAGE ? count - PAGE : 0n;
      const ids = await client!.readContract({ address: address!, abi: stampBoxAbi, functionName: listFn, args: [user!, offset, PAGE] });
      return loadStamps(client!, address!, startBlock, [...ids].reverse()); // newest first
    },
  });
}

export function useStampDetail(id: bigint | undefined) {
  const { client, address, startBlock, key } = useStampBox();
  return useQuery({
    queryKey: ["stamp", key, id?.toString()],
    enabled: Boolean(client && address && id !== undefined),
    refetchInterval: 20_000,
    queryFn: async () => {
      const count = await client!.readContract({ address: address!, abi: stampBoxAbi, functionName: "stampsCount" });
      if (id! >= count) return null;
      const [item] = await loadStamps(client!, address!, startBlock, [id!]);
      return item;
    },
  });
}

export type InboxInfo = { price: bigint; bio: string; open: boolean };

export function useInboxInfo(user: Address | undefined) {
  const { client, address, key } = useStampBox();
  return useQuery({
    queryKey: ["inboxInfo", key, user],
    enabled: Boolean(client && address && user),
    queryFn: async (): Promise<InboxInfo> => {
      const [price, bio] = await Promise.all([
        client!.readContract({ address: address!, abi: stampBoxAbi, functionName: "priceOf", args: [user!] }),
        client!.readContract({ address: address!, abi: stampBoxAbi, functionName: "bioOf", args: [user!] }),
      ]);
      return { price, bio, open: price > 0n };
    },
  });
}

export function useStats() {
  const { client, address, key } = useStampBox();
  return useQuery({
    queryKey: ["stats", key],
    enabled: Boolean(client && address),
    refetchInterval: 20_000,
    queryFn: async () => {
      const read = (functionName: "stampsCount" | "totalSent" | "totalRefunded" | "totalKept" | "totalReclaimed") =>
        client!.readContract({ address: address!, abi: stampBoxAbi, functionName });
      const [count, sent, refunded, kept, reclaimed] = await Promise.all([
        read("stampsCount"),
        read("totalSent"),
        read("totalRefunded"),
        read("totalKept"),
        read("totalReclaimed"),
      ]);
      return { count, sent, refunded, kept, reclaimed };
    },
  });
}

/** USDC a refund/reclaim couldn't push to `user` (e.g. their wallet rejected it), claimable via withdraw(). */
export function useOwed(user: Address | undefined) {
  const { client, address, key } = useStampBox();
  return useQuery({
    queryKey: ["owed", key, user],
    enabled: Boolean(client && address && user),
    refetchInterval: 30_000,
    queryFn: () => client!.readContract({ address: address!, abi: stampBoxAbi, functionName: "owed", args: [user!] }),
  });
}

/** Optimistically patch a stamp's status in every cached list; returns a rollback. */
export function useOptimisticStamps() {
  const qc = useQueryClient();
  return (ids: bigint[], status: StampStatus) => {
    const snapshots = qc.getQueriesData<StampItem[]>({ queryKey: ["mailbox"] });
    const set = new Set(ids);
    for (const [key, data] of snapshots) {
      if (!data) continue;
      qc.setQueryData<StampItem[]>(key, data.map((s) => (set.has(s.id) ? { ...s, status } : s)));
    }
    return () => snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
  };
}
