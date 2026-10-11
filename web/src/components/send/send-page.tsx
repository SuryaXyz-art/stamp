"use client";

import { AlertTriangle, ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useId, useState } from "react";
import { decodeEventLog, type Address } from "viem";
import { useAccount, useBalance, useSwitchChain } from "wagmi";
import { RuntimeGate } from "@/components/connect-gate";
import { CopyButton } from "@/components/copy-button";
import { useNetwork } from "@/components/providers/network-provider";
import { EmptyState } from "@/components/stamp/empty-state";
import { Avatar } from "@/components/stamp/avatar";
import { VerifiedBadges } from "@/components/stamp/verified-badges";
import { PostageStamp } from "@/components/stamp/postage-stamp";
import { Postmark } from "@/components/stamp/postmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { stampBoxAbi } from "@/generated/stampBoxAbi";
import type { PublicProfile } from "@/lib/api-client";
import { useAuth } from "@/components/wallet/auth-context";
import { useStampTx } from "@/hooks/use-stamp-tx";
import { useInboxInfo } from "@/hooks/use-stampbox";
import { FAUCET_URL } from "@/lib/chains";
import { byteLength, formatStampPrice, formatUsdc, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAX_BYTES = 1000;
/** Headroom for gas. Arc fees are a fraction of a cent; this is generous on purpose. */
const GAS_BUFFER = 10n ** 16n; // $0.01

function composeMessage(message: string, contact: string) {
  const body = message.trim();
  const c = contact.trim();
  return c ? `${body}\n\n— Reply to: ${c}` : body;
}

type Props = { to: Address; profile?: PublicProfile | null };

function SendSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

/** The public send page for an inbox (by address or @handle). Wallet hooks only mount once the runtime is loaded. */
export function SendPage(props: Props) {
  return (
    <RuntimeGate fallback={<SendSkeleton />}>
      <SendPageInner {...props} />
    </RuntimeGate>
  );
}

function SendPageInner({ to, profile }: Props) {
  const { chain, stampBox } = useNetwork();
  const { data: inbox, isLoading, isError, refetch } = useInboxInfo(to);
  const { address: me, isConnected, chainId } = useAccount();
  const { data: balance } = useBalance({ address: me, chainId: chain.id, query: { enabled: Boolean(me), refetchInterval: 15_000 } });
  const auth = useAuth();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { run, busy } = useStampTx();
  const reduce = useReducedMotion();
  const ids = { message: useId(), contact: useId(), contactHint: useId(), counter: useId(), warning: useId() };

  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState<{ id: bigint; hash: string } | null>(null);
  const [stamping, setStamping] = useState(false);

  const full = composeMessage(message, contact);
  const bytes = byteLength(full);
  const tooLong = bytes > MAX_BYTES;
  const price = inbox?.price;
  const priceLabel = formatStampPrice(price);
  const isSelf = me?.toLowerCase() === to.toLowerCase();
  const wrongChain = isConnected && chainId !== chain.id;
  const lowBalance = Boolean(balance && price !== undefined && balance.value < price + GAS_BUFFER);

  async function send() {
    if (!price) return;
    try {
      const res = await run({
        functionName: "send",
        args: [to, full],
        value: price,
        labels: { pending: `Sending your message with a ${priceLabel} stamp`, success: "Delivered ✓" },
      });
      if (!res) return;
      const log = res.receipt.logs
        .map((l) => {
          try {
            return decodeEventLog({ abi: stampBoxAbi, data: l.data, topics: l.topics });
          } catch {
            return null;
          }
        })
        .find((e) => e?.eventName === "Sent");
      const id = log && log.eventName === "Sent" ? log.args.id : 0n;
      setStamping(true);
      setTimeout(
        () => {
          setSent({ id, hash: res.hash });
          setStamping(false);
          setMessage("");
          setContact("");
        },
        reduce ? 0 : 1100,
      );
    } catch {
      // toast already explains what happened
    }
  }

  if (!stampBox) return null;

  if (isLoading) return <SendSkeleton />;

  if (isError || !inbox) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title="Couldn't reach Arc"
          description={`We couldn't read this inbox from ${chain.name}. Check your connection and try again.`}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      </div>
    );
  }

  if (!inbox.open) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title="This inbox is closed"
          description={
            <>
              <span className="tabular">{shortAddress(to)}</span> isn&apos;t accepting stamped messages on {chain.name} right now. If this
              is your address, you can open it in 30 seconds.
            </>
          }
          action={
            <Button asChild>
              <Link href="/setup">Open an inbox</Link>
            </Button>
          }
        />
      </div>
    );
  }

  let cta: React.ReactNode;
  if (!isConnected) {
    cta = (
      <Button size="lg" className="h-12 w-full rounded-xl text-base" onClick={auth.login} disabled={!auth.ready}>
        {auth.mode === "privy" ? "Sign in to send" : "Connect wallet to send"}
      </Button>
    );
  } else if (wrongChain) {
    cta = (
      <Button size="lg" className="h-12 w-full rounded-xl text-base" onClick={() => switchChain({ chainId: chain.id })} disabled={switching}>
        {switching ? "Switching…" : `Switch to ${chain.name}`}
      </Button>
    );
  } else if (isSelf) {
    cta = (
      <Button size="lg" className="h-12 w-full rounded-xl text-base" disabled>
        This is your inbox
      </Button>
    );
  } else {
    cta = (
      <Button
        size="lg"
        className="h-12 w-full rounded-xl text-base"
        onClick={send}
        disabled={busy || stamping || !message.trim() || tooLong || lowBalance}
        aria-describedby={ids.warning}
      >
        {busy ? "Sending…" : `Send with ${priceLabel} stamp`}
      </Button>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-14">
      <section aria-label="Receiver" className="flex items-center gap-5 sm:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <Avatar address={to} src={profile?.avatarUrl} size={profile ? 56 : 44} />
            <div className="min-w-0">
              {profile?.handle ? (
                <>
                  <h1 className="truncate font-display text-3xl leading-tight font-bold sm:text-4xl">{profile.displayName || `@${profile.handle}`}</h1>
                  <p className="font-mono text-sm text-muted-foreground">
                    {profile.displayName ? `@${profile.handle} · ` : ""}
                    {shortAddress(to)}
                  </p>
                </>
              ) : (
                <h1 className="font-mono text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">{shortAddress(to)}</h1>
              )}
              <CopyButton value={to} label="Copy address" className="-ml-2 h-7 border-0 bg-transparent px-2 text-xs text-muted-foreground shadow-none" />
            </div>
          </div>
          {profile && profile.badges.length > 0 && <VerifiedBadges badges={profile.badges} className="mt-3" />}
          {inbox?.bio && <p className="mt-3 text-lg text-pretty wrap-anywhere">{inbox.bio}</p>}
          <p className="mt-2 text-sm text-muted-foreground">
            Charges a <span className="font-mono font-medium text-foreground">{formatUsdc(price, { suffix: true })}</span> refundable stamp to reach them.
          </p>
        </div>
        <PostageStamp price={priceLabel} size="lg" tilt={4} className="hidden sm:block" />
        <PostageStamp price={priceLabel} size="md" tilt={4} className="sm:hidden" />
      </section>

      <AnimatePresence mode="wait">
        {sent ? (
          <motion.section
            key="sent"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="stamp-card mt-8 p-6 py-10 text-center sm:p-10"
            aria-live="polite"
          >
            <Postmark status="pending" size={110} className="mx-auto" />
            <h2 className="mt-4 font-display text-3xl font-bold text-lime-ink uppercase">Delivered ✓</h2>
            <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
              Your stamp is held by the contract. If they reply, it comes straight back to you. No reply in 7 days? Reclaim it from
              your Sent page.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Button asChild>
                <Link href={`/stamp/${sent.id}`}>
                  View receipt <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setSent(null)}>
                Send another
              </Button>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="compose"
            aria-label="Write a message"
            className="stamp-card relative mt-8 overflow-hidden p-5 py-8 sm:p-8"
            animate={stamping && !reduce ? { x: [0, 0, 600], rotate: [0, 0, 6], opacity: [1, 1, 0] } : { x: 0, rotate: 0, opacity: 1 }}
            transition={{ duration: 1.1, times: [0, 0.55, 1], ease: "easeIn" }}
          >
            <AnimatePresence>
              {stamping && (
                <motion.div
                  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
                  initial={{ scale: 2.4, opacity: 0, rotate: -25 }}
                  animate={{ scale: 1, opacity: 1, rotate: -10 }}
                  transition={{ type: "spring", stiffness: 600, damping: 22 }}
                  aria-hidden="true"
                >
                  <Postmark status="pending" date="DELIVERED" size={150} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor={ids.message} className="text-sm font-medium">
                Your message
              </Label>
              <Textarea
                id={ids.message}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Introduce yourself and say why you're reaching out…"
                rows={6}
                className="min-h-36 resize-y rounded-xl bg-background text-[15px] leading-relaxed"
                aria-describedby={`${ids.counter} ${ids.warning}`}
                aria-invalid={tooLong}
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor={ids.contact} className="text-sm font-medium">
                Reply-to contact <span className="font-normal text-muted-foreground">(optional, published with your message)</span>
              </Label>
              <Input
                id={ids.contact}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="@handle on X, or t.me/you"
                className="h-10 rounded-xl bg-background"
                aria-describedby={ids.contactHint}
              />
              <p id={ids.contactHint} className={cn("text-xs", contact.trim() ? "text-amber-ink" : "text-muted-foreground")}>
                {contact.trim()
                  ? "Anyone can read this on-chain, forever, and scrapers do. Prefer a public handle over your email or phone number."
                  : "Anything you put here becomes public on-chain. A public handle is safer than an email address."}
              </p>
            </div>

            <div className="mt-3 flex items-start justify-between gap-4 text-xs">
              <p id={ids.warning} className="flex items-start gap-1.5 text-amber-ink">
                <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                Messages are public on-chain. Don&apos;t include anything secret.
              </p>
              <p id={ids.counter} className={cn("shrink-0 tabular", tooLong ? "font-medium text-stamp-ink" : "text-muted-foreground")}>
                {bytes} / {MAX_BYTES}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {cta}
              {isConnected && !wrongChain && balance && (
                <p className="text-center text-sm text-muted-foreground">
                  Balance: <span className="tabular">{formatUsdc(balance.value, { suffix: true })}</span>
                  {lowBalance && (
                    <>
                      {" · "}
                      <span className="text-stamp-ink">Not enough USDC.</span>{" "}
                      <a href={FAUCET_URL} target="_blank" rel="noopener" className="font-medium text-usdc-ink underline underline-offset-4">
                        Get USDC
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <ul className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <li className="flex gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-lime-ink" aria-hidden="true" />
          You get this back if they reply. The stamp is held by an immutable contract, not by them.
        </li>
        <li className="flex gap-2.5">
          <Clock className="mt-0.5 size-4 shrink-0 text-cyan-ink" aria-hidden="true" />
          If they don&apos;t respond in 7 days, you can reclaim it yourself.
        </li>
      </ul>
    </div>
  );
}
