"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { numberToHex } from "viem";
import { Button } from "@/components/ui/button";
import { useNetwork } from "@/components/providers/network-provider";
import { cn } from "@/lib/utils";

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

/** One click: adds the selected Arc network to MetaMask (or any EIP-3085 wallet) and switches to it. Works before connecting. */
export function AddArcButton({ className, variant = "outline" }: { className?: string; variant?: "outline" | "ghost" | "default" }) {
  const { chain, rpcUrl } = useNetwork();

  async function add() {
    const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum;
    if (!eth) {
      toast.error("No browser wallet found", {
        description: "Install MetaMask (or Rabby) to use Stamp, then refresh this page.",
        action: { label: "Get MetaMask", onClick: () => window.open("https://metamask.io/download/", "_blank", "noopener") },
      });
      return;
    }
    try {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: numberToHex(chain.id),
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: [rpcUrl],
            blockExplorerUrls: [chain.blockExplorers.default.url],
          },
        ],
      });
      toast.success(`${chain.name} added`, { description: "Your wallet is ready to send stamps." });
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code === 4001) toast("Cancelled. No changes made.");
      else toast.error("Couldn't add Arc", { description: (err as Error).message });
    }
  }

  return (
    <Button type="button" variant={variant} size="sm" onClick={add} className={cn("gap-1.5", className)}>
      <Plus aria-hidden="true" />
      Add {chain.name} to wallet
    </Button>
  );
}
