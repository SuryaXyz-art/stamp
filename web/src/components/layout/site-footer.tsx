"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useNetwork } from "@/components/providers/network-provider";
import { AddArcButton } from "@/components/wallet/add-arc-button";
import { FAUCET_URL, type NetworkKey } from "@/lib/chains";
import { shortAddress } from "@/lib/format";
import { REPO_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  const { key, setNetwork, chain, stampBox } = useNetwork();
  const options: { key: NetworkKey; label: string }[] = [
    { key: "mainnet", label: "Mainnet" },
    { key: "testnet", label: "Testnet" },
  ];
  return (
    <footer className="mt-24 border-t border-border/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="max-w-md">
            A refundable paid inbox on Arc. Non-custodial, immutable, no admin keys. Messages are public on-chain.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {stampBox && (
              <a
                className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
                href={`${chain.blockExplorers.default.url}/address/${stampBox}`}
                target="_blank"
                rel="noopener"
              >
                Contract {shortAddress(stampBox)} <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            )}
            <a className="underline-offset-4 hover:text-foreground hover:underline" href={REPO_URL} target="_blank" rel="noopener">
              GitHub
            </a>
            <a className="underline-offset-4 hover:text-foreground hover:underline" href="https://docs.arc.io" target="_blank" rel="noopener">
              Arc docs
            </a>
            <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/privacy">
              Privacy
            </Link>
          </p>
        </div>
        <div className="space-y-3" data-tour="network">
          <div role="radiogroup" aria-label="Arc network" className="inline-flex rounded-xl border border-border bg-muted p-1">
            {options.map((o) => (
              <button
                key={o.key}
                role="radio"
                aria-checked={key === o.key}
                onClick={() => setNetwork(o.key)}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-sm transition-colors duration-150",
                  key === o.key ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {key === "testnet" ? (
              <>
                Testnet is free to try.{" "}
                <a className="font-medium text-usdc-ink underline underline-offset-4" href={FAUCET_URL} target="_blank" rel="noopener">
                  Get test USDC
                </a>
              </>
            ) : (
              "Mainnet uses real USDC."
            )}
          </p>
          <AddArcButton variant="ghost" className="-ml-2.5 text-muted-foreground" />
        </div>
      </div>
    </footer>
  );
}
