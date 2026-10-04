"use client";

import { Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { useStampTx } from "@/hooks/use-stamp-tx";
import { useOwed } from "@/hooks/use-stampbox";
import { formatUsdc } from "@/lib/format";

/**
 * Shown when a refund or reclaim couldn't be pushed to this wallet at settlement time
 * (e.g. a smart-contract wallet that rejected it). The USDC is safe in the contract until withdrawn.
 */
export function OwedBanner() {
  const { address } = useAccount();
  const { data: owed } = useOwed(address);
  const { run, busy } = useStampTx();
  if (!owed) return null;
  return (
    <div role="status" className="mt-6 flex flex-col gap-3 rounded-2xl border border-success/30 bg-success/5 p-4 sm:flex-row sm:items-center">
      <Wallet className="size-5 shrink-0 text-success" aria-hidden="true" />
      <p className="flex-1 text-sm">
        <span className="font-semibold">You have {formatUsdc(owed, { suffix: true })} to withdraw.</span>{" "}
        <span className="text-muted-foreground">A payout couldn&apos;t be delivered to your wallet automatically, so it&apos;s waiting in the contract.</span>
      </p>
      <Button
        className="rounded-xl"
        disabled={busy}
        onClick={() =>
          run({ functionName: "withdraw", labels: { pending: `Withdrawing ${formatUsdc(owed)}`, success: `${formatUsdc(owed)} withdrawn ✓` } }).catch(() => {})
        }
      >
        Withdraw {formatUsdc(owed)}
      </Button>
    </div>
  );
}
