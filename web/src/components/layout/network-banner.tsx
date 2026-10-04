"use client";

import { AlertTriangle, Info } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";
import { useNetwork } from "@/components/providers/network-provider";

/** Sticky banner: wallet on the wrong chain, or StampBox not yet deployed on the selected network. */
export function NetworkBanner() {
  const { chain, stampBox, key, setNetwork } = useNetwork();
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!stampBox) {
    return (
      <div role="status" className="sticky top-0 z-40 border-b border-border bg-muted/90 backdrop-blur">
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

  if (!isConnected || chainId === chain.id) return null;

  return (
    <div role="alert" className="sticky top-0 z-40 border-b border-amber/30 bg-amber/10 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2 text-sm">
        <AlertTriangle className="size-4 text-amber" aria-hidden="true" />
        <span>Your wallet is on another network. Stamp runs on {chain.name}.</span>
        <Button size="sm" onClick={() => switchChain({ chainId: chain.id })} disabled={isPending} className="h-7 rounded-lg">
          {isPending ? "Switching…" : `Switch to ${chain.name}`}
        </Button>
      </div>
    </div>
  );
}
