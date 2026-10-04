"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Hash, TransactionReceipt } from "viem";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { stampBoxAbi } from "@/generated/stampBoxAbi";
import { toFriendlyError } from "@/lib/errors";
import { useStampBox } from "./use-stampbox";

type WriteArgs = {
  functionName: "send" | "refund" | "keep" | "reclaim" | "batchKeep" | "batchRefund" | "openInbox" | "setPrice" | "closeInbox";
  args?: readonly unknown[];
  value?: bigint;
  /** Toast copy */
  labels: { pending: string; success: string };
};

/**
 * One transaction, three toast states: Confirm in wallet -> Sending… -> Delivered ✓ (with explorer link).
 * Arc finalises in under a second, so one confirmation is final; there is no "waiting for confirmations" step.
 */
export function useStampTx() {
  const { chain, client, address } = useStampBox();
  const { chainId, address: account } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async ({ functionName, args = [], value, labels }: WriteArgs): Promise<{ hash: Hash; receipt: TransactionReceipt } | undefined> => {
      if (!address || !client || !account) return;
      const id = toast.loading("Confirm in your wallet", { description: labels.pending });
      setBusy(true);
      try {
        if (chainId !== chain.id) await switchChainAsync({ chainId: chain.id });
        // Simulate first so contract errors ("This inbox is closed") surface before the wallet pops up.
        const { request } = await client.simulateContract({
          account,
          address,
          abi: stampBoxAbi,
          functionName,
          args,
          value,
        } as Parameters<typeof client.simulateContract>[0]);
        const hash = await writeContractAsync(request as Parameters<typeof writeContractAsync>[0]);
        toast.loading("Sending…", { id, description: labels.pending });
        const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1 });
        if (receipt.status !== "success") throw new Error("The transaction reverted on-chain.");
        toast.success(labels.success, {
          id,
          description: "Final on Arc.",
          action: { label: "View tx", onClick: () => window.open(`${chain.blockExplorers.default.url}/tx/${hash}`, "_blank", "noopener") },
        });
        await qc.invalidateQueries();
        return { hash, receipt };
      } catch (err) {
        const f = toFriendlyError(err);
        toast.error(f.title, {
          id,
          description: f.description,
          action: f.action ? { label: f.action.label, onClick: () => window.open(f.action!.href, "_blank", "noopener") } : undefined,
        });
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [address, client, account, chainId, chain, switchChainAsync, writeContractAsync, qc],
  );

  return { run, busy };
}
