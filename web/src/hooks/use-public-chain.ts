"use client";

import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/components/providers/network-provider";

/**
 * Chain reads for lightweight pages (the landing page), served by /api/chain/* so the browser doesn't download
 * viem. Wallet pages keep using useStampBox, which talks to the RPC directly.
 */

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function usePublicStats() {
  const { key } = useNetwork();
  return useQuery({
    queryKey: ["publicStats", key],
    refetchInterval: 20_000,
    queryFn: async () => {
      const d = await get<{ deployed: boolean; count?: string; refunded?: string; kept?: string; reclaimed?: string }>(`/api/chain/stats?network=${key}`);
      if (!d.deployed) return null;
      return { count: BigInt(d.count!), refunded: BigInt(d.refunded!), kept: BigInt(d.kept!), reclaimed: BigInt(d.reclaimed!) };
    },
  });
}

export function usePublicInbox(address: string | undefined) {
  const { key } = useNetwork();
  return useQuery({
    queryKey: ["publicInbox", key, address],
    enabled: Boolean(address),
    queryFn: async () => {
      const d = await get<{ deployed: boolean; price?: string; bio?: string; open?: boolean }>(`/api/chain/inbox?network=${key}&address=${address}`);
      return d.deployed ? { price: BigInt(d.price!), bio: d.bio ?? "", open: Boolean(d.open) } : null;
    },
  });
}
