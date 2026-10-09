"use client";

import { Check } from "lucide-react";
import { useId, useState } from "react";
import { parseEther } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { useNetwork } from "@/components/providers/network-provider";
import { PostageStamp } from "@/components/stamp/postage-stamp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AddArcButton } from "@/components/wallet/add-arc-button";
import { ConnectButton } from "@/components/wallet/connect-button";
import { useStampTx } from "@/hooks/use-stamp-tx";
import { useInboxInfo, type InboxInfo } from "@/hooks/use-stampbox";
import { byteLength, formatStampPrice, formatUsdc } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PricePicker } from "./price-picker";
import { SharePanel } from "./share-panel";

const steps = ["Connect", "Set your price", "Share"];
const MAX_BIO = 160;

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Progress">
      {steps.map((label, i) => (
        <li key={label} className="flex items-center gap-2" aria-current={i === current ? "step" : undefined}>
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-md border font-mono text-xs font-semibold transition-colors duration-200",
              i < current && "border-lime bg-lime text-black",
              i === current && "border-magenta bg-magenta/15 text-magenta-ink shadow-[var(--glow-magenta)]",
              i > current && "border-border text-muted-foreground",
            )}
          >
            {i < current ? <Check className="size-3.5" aria-label="done" /> : i + 1}
          </span>
          <span className={cn("hidden font-display font-semibold tracking-wide uppercase sm:inline", i === current ? "text-foreground" : "text-muted-foreground")}>{label}</span>
          {i < steps.length - 1 && <span className="h-px w-6 bg-border sm:w-10" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

function InboxForm({ inbox, onDone }: { inbox: InboxInfo | undefined; onDone: () => void }) {
  const { run, busy } = useStampTx();
  const bioId = useId();
  // An already-open inbox prefills the form, so this page doubles as "edit".
  const [price, setPrice] = useState<bigint | undefined>(inbox?.open ? inbox.price : parseEther("1"));
  const [bio, setBio] = useState(inbox?.bio ?? "");
  const bioBytes = byteLength(bio);

  async function open() {
    if (!price) return;
    try {
      await run({
        functionName: "openInbox",
        args: [price, bio.trim()],
        labels: { pending: `Opening your inbox at ${formatStampPrice(price)}`, success: "Your inbox is open ✓" },
      });
      onDone();
    } catch {}
  }

  return (
    <form
      className="space-y-7"
      onSubmit={(e) => {
        e.preventDefault();
        open();
      }}
    >
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <p className="kicker">Stamp price</p>
          <p className="mt-0.5 mb-3 text-sm text-muted-foreground">What a stranger puts down to reach you. Refunded when you reply.</p>
          <PricePicker value={price} onChange={setPrice} />
        </div>
        <PostageStamp price={formatStampPrice(price)} size="md" tilt={5} className="hidden sm:block" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={bioId} className="text-sm font-medium">
          Headline <span className="font-normal text-muted-foreground">(optional, public)</span>
        </Label>
        <Input
          id={bioId}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Founder @Acme · pitch me your seed round"
          className="h-11 rounded-xl bg-background"
          aria-invalid={bioBytes > MAX_BIO}
        />
        <p className={cn("text-right text-xs tabular", bioBytes > MAX_BIO ? "text-stamp-ink" : "text-muted-foreground")}>
          {bioBytes} / {MAX_BIO}
        </p>
      </div>
      <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={busy || !price || bioBytes > MAX_BIO}>
        {busy ? "Opening…" : inbox?.open ? `Save · ${formatUsdc(price)} stamp` : `Open inbox · ${formatUsdc(price)} stamp`}
      </Button>
      {inbox?.open && (
        <Button type="button" variant="ghost" className="w-full" onClick={onDone}>
          Skip. Just show me my link
        </Button>
      )}
    </form>
  );
}

export function SetupWizard() {
  const { chain } = useNetwork();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { data: inbox, isLoading } = useInboxInfo(address);
  const [done, setDone] = useState(false);

  const onArc = isConnected && chainId === chain.id;
  const step = done ? 2 : onArc ? 1 : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <Stepper current={step} />
      <h1 className="mt-8 font-display text-4xl font-bold uppercase sm:text-5xl">
        {step === 0 && "Open your inbox"}
        {step === 1 && (inbox?.open ? "Update your inbox" : "Set your price")}
        {step === 2 && "You're open for mail"}
      </h1>

      <div className="stamp-card mt-8 p-5 py-8 sm:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <p className="text-muted-foreground">
              Connect the wallet that should receive stamps. Stamp runs on {chain.name}, where gas is paid in USDC. No other token
              needed.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {!isConnected ? (
                <ConnectButton className="h-11 px-5" />
              ) : (
                <Button className="h-11 rounded-xl px-5" onClick={() => switchChain({ chainId: chain.id })} disabled={switching}>
                  {switching ? "Switching…" : `Add ${chain.name} & switch`}
                </Button>
              )}
              <AddArcButton variant="ghost" />
            </div>
          </div>
        )}

        {step === 1 &&
          (isLoading ? (
            <div className="space-y-4" aria-busy="true">
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ) : (
            <InboxForm key={address} inbox={inbox} onDone={() => setDone(true)} />
          ))}

        {step === 2 && address && (inbox?.open ? <SharePanel address={address} price={inbox.price} /> : <Skeleton className="h-64 rounded-xl" />)}
      </div>
    </div>
  );
}
