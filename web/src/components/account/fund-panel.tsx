"use client";

import { ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Address } from "viem";
import { useBalance } from "wagmi";
import { CopyButton } from "@/components/copy-button";
import { useNetwork } from "@/components/providers/network-provider";
import { Button } from "@/components/ui/button";
import { FAUCET_URL } from "@/lib/chains";
import { formatUsdc } from "@/lib/format";

/** Address, QR and live balance, plus Circle's faucet on testnet. Balance refreshes every 5s so funding feels live. */
export function FundPanel({ address }: { address: Address }) {
  const { chain, key } = useNetwork();
  const { data: balance, isLoading } = useBalance({ address, chainId: chain.id, query: { refetchInterval: 5_000 } });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <div className="rounded-lg bg-white p-3 shadow-[0_0_0_1px_var(--violet),0_0_24px_-6px_var(--violet)]">
        <QRCodeSVG value={address} size={148} fgColor="#120E1F" bgColor="#FFFFFF" level="M" title="QR code of your wallet address" />
      </div>
      <div className="w-full min-w-0 flex-1 space-y-4">
        <div>
          <p className="kicker">Your wallet on {chain.name}</p>
          <p className="mt-1 font-mono text-sm break-all">{address}</p>
          <CopyButton value={address} label="Copy address" className="mt-2 h-9 rounded-lg" />
        </div>
        <div>
          <p className="kicker">Balance</p>
          <p className="mt-1 font-mono text-2xl tabular-nums" aria-live="polite">
            {isLoading ? "…" : formatUsdc(balance?.value ?? 0n, { suffix: true })}
          </p>
        </div>
        {key === "testnet" ? (
          <Button asChild variant="outline" className="h-11 w-full rounded-lg sm:w-auto">
            <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer">
              Get free test USDC (Circle faucet) <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Send USDC on Arc to this address from an exchange or another wallet.</p>
        )}
        {key === "testnet" && (
          <p className="text-xs text-muted-foreground">
            On the faucet, pick <span className="font-medium text-foreground">Arc Testnet</span>, paste your address and request USDC. It
            lands here in a few seconds. USDC also pays for gas on Arc.
          </p>
        )}
      </div>
    </div>
  );
}

/** Enough to open an inbox or send a stamp: Arc gas is a fraction of a cent. */
export const MIN_GAS = 10n ** 15n; // $0.001
