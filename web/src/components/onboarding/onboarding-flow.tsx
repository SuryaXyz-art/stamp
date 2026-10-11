"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { parseEther } from "viem";
import { useBalance } from "wagmi";
import { FundPanel, MIN_GAS } from "@/components/account/fund-panel";
import { HandleForm } from "@/components/account/handle-form";
import { useNetwork } from "@/components/providers/network-provider";
import { PricePicker } from "@/components/setup/price-picker";
import { SharePanel } from "@/components/setup/share-panel";
import { PostageStamp } from "@/components/stamp/postage-stamp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useRequireRuntime } from "@/components/wallet/auth-context";
import { useFeatures, useMe, useUpdateMe } from "@/hooks/use-profile";
import { useStampTx } from "@/hooks/use-stamp-tx";
import { useInboxInfo } from "@/hooks/use-stampbox";
import { byteLength, formatStampPrice, formatUsdc } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS = ["Sign in", "Claim & price", "Fund & open"];
const MAX_BIO = 160;

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Progress">
      {STEPS.map((label, i) => (
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
          <span className={cn("hidden font-display font-semibold tracking-wide uppercase sm:inline", i === current ? "text-foreground" : "text-muted-foreground")}>
            {label}
          </span>
          {i < STEPS.length - 1 && <span className="h-px w-6 bg-border sm:w-10" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

function SignInStep() {
  const auth = useAuth();
  return (
    <div className="space-y-5">
      <p className="text-muted-foreground">
        {auth.mode === "privy"
          ? "Use X, Discord, Google, email or a passkey, and we'll create a wallet for you. Already have a wallet? Use that instead."
          : "Connect the browser wallet that should receive stamps."}
      </p>
      <Button size="lg" className="h-12 w-full rounded-lg text-base sm:w-auto sm:px-8" onClick={auth.login} disabled={!auth.ready}>
        {auth.mode === "privy" ? "Sign in" : "Connect wallet"}
      </Button>
    </div>
  );
}

/** Step 2: handle (when accounts are on), price and headline. The price is applied on-chain in step 3. */
function ClaimStep({ onNext }: { onNext: (price: bigint, headline: string) => void }) {
  const { data: features } = useFeatures();
  const { data: me } = useMe();
  const update = useUpdateMe();
  const bioId = useId();
  const saved = me?.onboarding.price ? BigInt(me.onboarding.price) : undefined;
  const [price, setPrice] = useState<bigint | undefined>(saved ?? parseEther("1"));
  const [bio, setBio] = useState(me?.onboarding.headline ?? "");
  const tooLong = byteLength(bio) > MAX_BIO;
  const needsHandle = Boolean(features?.accounts) && !me?.handle;

  async function next() {
    if (!price || tooLong) return;
    if (features?.accounts) await update.mutateAsync({ onboarding: { price: price.toString(), headline: bio.trim() } }).catch(() => {});
    onNext(price, bio.trim());
  }

  return (
    <div className="space-y-8">
      {features?.accounts &&
        (me ? (
          <div className="space-y-2">
            <HandleForm current={me.handle} submitLabel={me.handle ? "Change handle" : "Claim handle"} />
            <p className="text-xs text-muted-foreground">Your public link becomes stamp/@handle. You sign a free message to prove the wallet is yours.</p>
          </div>
        ) : (
          <Skeleton className="h-20 rounded-lg" />
        ))}

      <div className="flex items-start gap-6">
        <div className="flex-1">
          <p className="kicker">Stamp price</p>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">What a stranger puts down to reach you. They get it back when you reply.</p>
          <PricePicker value={price} onChange={setPrice} />
        </div>
        <PostageStamp price={formatStampPrice(price)} size="md" tilt={5} className="hidden sm:block" />
      </div>

      <div className="space-y-2">
        <label htmlFor={bioId} className="kicker block">
          Headline <span className="tracking-normal text-muted-foreground normal-case">(optional, public on-chain)</span>
        </label>
        <Input
          id={bioId}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Founder @Acme · pitch me your seed round"
          className="h-11 rounded-lg"
          aria-invalid={tooLong}
        />
        <p className={cn("text-right font-mono text-xs", tooLong ? "text-magenta-ink" : "text-muted-foreground")}>
          {byteLength(bio)} / {MAX_BIO}
        </p>
      </div>

      <Button size="lg" className="h-12 w-full rounded-lg text-base" onClick={next} disabled={!price || tooLong || needsHandle || update.isPending}>
        {needsHandle ? "Claim a handle to continue" : `Continue · ${formatUsdc(price)} stamp`}
      </Button>
    </div>
  );
}

/** Step 3: fund the wallet (gas is paid in USDC on Arc), then open the inbox in one transaction. */
function FundStep({ price, headline, onBack }: { price: bigint; headline: string; onBack: () => void }) {
  const auth = useAuth();
  const { chain } = useNetwork();
  const { data: balance } = useBalance({ address: auth.address, chainId: chain.id, query: { refetchInterval: 5_000 } });
  const { run, busy } = useStampTx();
  const update = useUpdateMe();
  const { data: features } = useFeatures();
  const funded = (balance?.value ?? 0n) >= MIN_GAS;

  async function open() {
    try {
      await run({
        functionName: "openInbox",
        args: [price, headline],
        labels: { pending: `Opening your inbox at ${formatStampPrice(price)}`, success: "Your inbox is open ✓" },
      });
      if (features?.accounts) update.mutate({ onboarding: { done: true } });
    } catch {}
  }

  if (!auth.address) return null;
  return (
    <div className="space-y-8">
      <FundPanel address={auth.address} />
      <div className="space-y-2">
        <Button size="lg" className="h-12 w-full rounded-lg text-base" onClick={open} disabled={!funded || busy}>
          {busy ? "Opening…" : funded ? `Open inbox · ${formatUsdc(price)} stamp` : "Waiting for USDC…"}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}

export function OnboardingFlow() {
  const mounted = useRequireRuntime();
  const auth = useAuth();
  const { data: me } = useMe();
  const { data: inbox, isLoading } = useInboxInfo(auth.address);
  const [choice, setChoice] = useState<{ price: bigint; headline: string } | null>(null);

  const loading = !mounted || !auth.ready || (auth.authenticated && isLoading);
  const step = !auth.authenticated ? 0 : inbox?.open ? 3 : choice ? 2 : 1;
  const titles = ["Open your inbox", "Claim your name", "Fund & open", "You're open for mail"];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <Stepper current={Math.min(step, 3)} />
      <h1 className="mt-8 font-display text-4xl font-bold uppercase sm:text-5xl">{titles[step]}</h1>
      <div className="stamp-card mt-8 p-5 py-8 sm:p-8">
        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading">
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ) : step === 0 ? (
          <SignInStep />
        ) : step === 1 ? (
          <ClaimStep onNext={(price, headline) => setChoice({ price, headline })} />
        ) : step === 2 && choice ? (
          <FundStep price={choice.price} headline={choice.headline} onBack={() => setChoice(null)} />
        ) : inbox?.open && auth.address ? (
          <div className="space-y-8">
            <SharePanel address={auth.address} price={inbox.price} handle={me?.handle} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="h-11 flex-1 rounded-lg">
                <Link href="/inbox">Go to my inbox</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 flex-1 rounded-lg">
                <Link href="/settings">Settings</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
