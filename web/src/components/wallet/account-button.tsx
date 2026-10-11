"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-context";

const AccountMenu = dynamic(() => import("./account-menu"), {
  ssr: false,
  loading: () => <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" aria-hidden="true" />,
});

/** "Sign in" when signed out; the account menu (lazy) when signed in. Never loads wallet code by itself. */
export function AccountButton({ className, label = "Sign in" }: { className?: string; label?: string }) {
  const auth = useAuth();

  if (auth.runtime === "error") {
    return (
      <Button disabled className={cn("h-9 rounded-lg px-4", className)} title="Sign-in couldn't start. Reload to try again.">
        Sign-in unavailable
      </Button>
    );
  }

  if (auth.runtime !== "idle" && !auth.ready) {
    return <div className={cn("h-9 w-28 animate-pulse rounded-lg bg-muted", className)} aria-hidden="true" />;
  }

  if (!auth.authenticated || !auth.address) {
    return (
      <Button onClick={auth.login} className={cn("h-9 rounded-lg px-4", className)}>
        {label}
      </Button>
    );
  }

  return <AccountMenu className={className} />;
}
