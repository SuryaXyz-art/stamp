"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { useSignMessage } from "wagmi";
import { useNetwork } from "@/components/providers/network-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/wallet/auth-context";
import { api, type PrivateProfile } from "@/lib/api-client";
import { checkHandle } from "@/lib/handles";
import { cn } from "@/lib/utils";

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Pick a handle, see if it's free as you type, then bind it to your wallet with a free signature.
 * Renders inside the wallet runtime (uses wagmi's signMessage).
 */
export function HandleForm({
  current,
  onClaimed,
  submitLabel = "Claim handle",
  hideSubmit,
  id: formId,
}: {
  current?: string | null;
  onClaimed?: (profile: PrivateProfile) => void;
  submitLabel?: string;
  hideSubmit?: boolean;
  id?: string;
}) {
  const auth = useAuth();
  const { chain } = useNetwork();
  const qc = useQueryClient();
  const { signMessageAsync } = useSignMessage();
  const inputId = useId();
  const hintId = useId();
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const local = checkHandle(value);
  const debounced = useDebounced(local.ok ? local.handle : "", 350);
  const unchanged = local.ok && local.handle === current;

  const { data: remote, isFetching } = useQuery({
    queryKey: ["handle", debounced],
    enabled: Boolean(debounced) && debounced !== current,
    staleTime: 10_000,
    queryFn: () => api<{ available: boolean; error?: string }>(`/api/handles?q=${encodeURIComponent(debounced)}`),
  });

  const status: { tone: "ok" | "bad" | "idle" | "busy"; text: string } = !value
    ? { tone: "idle", text: "3–20 characters: a–z, 0–9 and _." }
    : !local.ok
      ? { tone: "bad", text: local.error }
      : unchanged
        ? { tone: "ok", text: "This is your handle." }
        : isFetching || debounced !== local.handle
          ? { tone: "busy", text: "Checking…" }
          : remote?.available
            ? { tone: "ok", text: `@${local.handle} is free.` }
            : { tone: "bad", text: remote?.error ?? "Not available." };

  async function claim() {
    if (!local.ok || !auth.address || status.tone !== "ok" || unchanged) return;
    setBusy(true);
    const id = toast.loading("Sign to claim your handle", { description: "Free. No transaction, no gas." });
    try {
      const token = await auth.getAccessToken();
      const challenge = await api<{ message: string; token: string }>("/api/handles/challenge", {
        method: "POST",
        token,
        body: { handle: local.handle, address: auth.address, chainId: chain.id },
      });
      const signature = await signMessageAsync({ message: challenge.message });
      const { profile } = await api<{ profile: PrivateProfile }>("/api/handles/claim", {
        method: "POST",
        token: await auth.getAccessToken(),
        body: { token: challenge.token, signature },
      });
      qc.setQueriesData({ queryKey: ["me"] }, profile);
      toast.success(`@${profile.handle} is yours ✓`, { id });
      onClaimed?.(profile);
    } catch (err) {
      const msg = (err as { shortMessage?: string; message: string }).shortMessage ?? (err as Error).message;
      toast.error(/reject|denied/i.test(msg) ? "Signature cancelled" : "Couldn't claim that handle", { id, description: /reject|denied/i.test(msg) ? undefined : msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        claim();
      }}
      className="space-y-2"
    >
      <label htmlFor={inputId} className="kicker block">
        Handle
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 items-center rounded-lg border border-input bg-background/70 focus-within:border-ring focus-within:shadow-[var(--glow-ring)]">
          <span className="pl-3 font-mono text-muted-foreground" aria-hidden="true">
            @
          </span>
          <Input
            id={inputId}
            value={value}
            onChange={(e) => setValue(e.target.value.toLowerCase().replace(/^@/, ""))}
            placeholder="yourname"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            aria-describedby={hintId}
            aria-invalid={status.tone === "bad"}
            className="h-11 border-0 bg-transparent font-mono shadow-none focus-visible:shadow-none dark:bg-transparent"
          />
          <span className="pr-3" aria-hidden="true">
            {status.tone === "busy" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            {status.tone === "ok" && <Check className="size-4 text-lime-ink" />}
            {status.tone === "bad" && <X className="size-4 text-magenta-ink" />}
          </span>
        </div>
        {!hideSubmit && (
          <Button type="submit" className="h-11 rounded-lg px-5" disabled={busy || status.tone !== "ok" || unchanged}>
            {busy ? "Waiting for signature…" : submitLabel}
          </Button>
        )}
      </div>
      <p
        id={hintId}
        aria-live="polite"
        className={cn(
          "text-xs",
          status.tone === "bad" ? "text-magenta-ink" : status.tone === "ok" ? "text-lime-ink" : "text-muted-foreground",
        )}
      >
        {status.text}
      </p>
    </form>
  );
}
