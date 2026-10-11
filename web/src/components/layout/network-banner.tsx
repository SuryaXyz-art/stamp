"use client";

import { useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNetwork } from "@/components/providers/network-provider";
import { useAuth } from "@/components/wallet/auth-context";

/** Sticky banner: wallet on the wrong chain, or StampBox not yet deployed on the selected network. */
export function NetworkBanner() {
  const { chain, stampBox, key, setNetwork } = useNetwork();
  const { authenticated, chainId, switchChain } = useAuth();
  const [isPending, setPending] = useState(false);

  if (!stampBox) {
    return (
      <div role="status" className="relative z-40 border-b border-border bg-muted/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
          <Info className="size-4 text-usdc-ink" aria-hidden="true" />
          <span>Stamp isn&apos;t live on {chain.name} yet.</span>
          <button
            className="font-medium text-usdc-ink underline underline-offset-4"
            onClick={() => setNetwork(key === "mainnet" ? "testnet" : "mainnet")}
          >
            Use {key === "mainnet" ? "Testnet" : "Mainnet"} instead
          </button>
        </div>
      </div>
    );
  }

  if (!authenticated || !chainId || chainId === chain.id) return null;

  return (
    <div role="alert" className="relative z-40 border-b border-amber/40 bg-amber/10 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2 text-sm">
        <AlertTriangle className="size-4 text-amber-ink" aria-hidden="true" />
        <span>Your wallet is on another network. Stamp runs on {chain.name}.</span>
        <Button size="sm" onClick={() => {
            setPending(true);
            switchChain(chain.id).catch(() => {}).finally(() => setPending(false));
          }} disabled={isPending} className="h-7 rounded-lg">
          {isPending ? "Switching…" : `Switch to ${chain.name}`}
        </Button>
      </div>
    </div>
  );
}
