"use client";

import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import { EmptyState } from "@/components/stamp/empty-state";
import { ConnectButton } from "@/components/wallet/connect-button";

/** Renders children only with a connected wallet; otherwise a friendly prompt. */
export function ConnectGate({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const { isConnected, isConnecting, isReconnecting } = useAccount();
  if (isConnecting || isReconnecting) return null;
  if (!isConnected) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={title} description={description} action={<ConnectButton className="h-11 px-5" />} />
      </div>
    );
  }
  return <>{children}</>;
}
