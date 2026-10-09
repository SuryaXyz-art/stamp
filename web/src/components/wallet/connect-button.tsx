"use client";

import { ConnectButton as RKConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Identicon } from "@/components/stamp/identicon";
import { cn } from "@/lib/utils";

/** RainbowKit, dressed for the post office. */
export function ConnectButton({ className, label = "Connect wallet" }: { className?: string; label?: string }) {
  return (
    <RKConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        if (!ready) {
          return <div className={cn("h-9 w-36 rounded-lg bg-muted", className)} aria-hidden="true" />;
        }
        if (!account) {
          return (
            <Button onClick={openConnectModal} className={cn("h-9 gap-2 rounded-lg px-4", className)}>
              <Wallet aria-hidden="true" />
              {label}
            </Button>
          );
        }
        if (chain?.unsupported) {
          return (
            <Button variant="destructive" onClick={openChainModal} className={cn("h-9 rounded-lg px-4", className)}>
              Wrong network
            </Button>
          );
        }
        return (
          <Button
            variant="outline"
            onClick={openAccountModal}
            className={cn("h-9 gap-2 rounded-lg pr-2.5 pl-1.5", className)}
            aria-label={`Wallet ${account.displayName}, open account menu`}
          >
            <Identicon address={account.address} size={24} />
            <span className="tabular">{account.displayName}</span>
            <ChevronDown aria-hidden="true" className="opacity-60" />
          </Button>
        );
      }}
    </RKConnectButton.Custom>
  );
}
