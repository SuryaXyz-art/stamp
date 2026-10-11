"use client";

import type { ReactNode } from "react";
import { EmptyState } from "@/components/stamp/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountButton } from "@/components/wallet/account-button";
import { useAuth, useRequireRuntime, useRuntimeFailed } from "@/components/wallet/auth-context";

/** Shown when the sign-in runtime failed to load or crashed. */
function Unavailable() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        title="Sign-in is unavailable"
        description="We couldn't start sign-in on this page. Reload to try again; if it keeps happening, the sign-in service may be down."
      />
    </div>
  );
}

/** Loads the wallet runtime for this page, then renders children only for a signed-in user. */
export function ConnectGate({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const mounted = useRequireRuntime();
  const failed = useRuntimeFailed();
  const auth = useAuth();
  if (failed) return <Unavailable />;
  if (!mounted || !auth.ready) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-12" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-12 w-48 rounded-lg" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    );
  }
  if (!auth.authenticated) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title={title}
          description={description}
          action={<AccountButton className="h-11 px-6" label={auth.mode === "privy" ? "Sign in" : "Connect wallet"} />}
        />
      </div>
    );
  }
  return <>{children}</>;
}

/** Like ConnectGate but renders for signed-out visitors too, once wallet hooks are safe to use. */
export function RuntimeGate({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const mounted = useRequireRuntime();
  const failed = useRuntimeFailed();
  if (failed) return <Unavailable />;
  return <>{mounted ? children : fallback}</>;
}
