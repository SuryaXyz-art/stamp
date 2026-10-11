import { ArrowRight, BadgeDollarSign, Fuel, MousePointerClick, Zap } from "lucide-react";
import Link from "next/link";
import { DemoInbox } from "@/components/landing/demo-inbox";
import { HeroDemo } from "@/components/landing/hero-demo";
import { LiveStats } from "@/components/landing/live-stats";
import { OnboardingTour } from "@/components/landing/onboarding-tour";
import { PostageStamp } from "@/components/stamp/postage-stamp";
import { Postmark } from "@/components/stamp/postmark";
import { Button } from "@/components/ui/button";
import { DEMO_INBOX } from "@/lib/config";

const whyArc = [
  {
    icon: Fuel,
    title: "Dollars in, dollars out",
    body: "Arc pays gas in USDC. A sender needs exactly one thing in their wallet: dollars.",
  },
  {
    icon: BadgeDollarSign,
    title: "A $1 stamp makes sense",
    body: "Fees are fractions of a cent. On most chains the gas would cost more than the stamp.",
  },
  {
    icon: Zap,
    title: "Sub-second finality",
    body: "Deterministic finality in under a second. Sending a stamp feels like sending a DM.",
  },
  {
    icon: MousePointerClick,
    title: "One click, no approvals",
    body: "The stamp rides along as native USDC. No approve-then-transfer, no allowances to revoke.",
  },
];

const steps = [
  {
    n: "01",
    title: "They stamp it",
    body: "A stranger writes to your link and attaches your price in USDC. It's held by the contract, not by you.",
    art: <PostageStamp price="$1" size="md" tilt={-6} />,
  },
  {
    n: "02",
    title: "You triage",
    body: "Every envelope shows its stamp. Keyboard shortcuts get you to inbox zero fast.",
    art: <Postmark status="pending" size={100} />,
  },
  {
    n: "03",
    title: "Refund or keep",
    body: "Reply and the stamp goes back. Spam? You keep it. Ignored for 7 days, the sender can reclaim it.",
    art: (
      <span className="flex gap-1">
        <Postmark status="refunded" size={88} className="-rotate-6" />
        <Postmark status="kept" size={88} className="rotate-6" />
      </span>
    ),
  },
];

const headline = "Your attention has a price.";

export default function Home() {
  return (
    <div className="space-y-24 pb-8 sm:space-y-32">
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 sm:pt-20 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="kicker inline-flex items-center gap-2 rounded-md border border-cyan/30 bg-cyan/5 px-2.5 py-1">
            <span className="size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" aria-hidden="true" />
            Refundable paid inbox · Arc
          </p>
          <h1 className="glitch mt-6 font-display text-5xl leading-[0.98] font-bold tracking-tight text-balance uppercase sm:text-7xl">
            <span>
              {headline} <span className="foil">Set it.</span>
            </span>
            <span className="glitch-layer glitch-a" aria-hidden="true">
              {headline} Set it.
            </span>
            <span className="glitch-layer glitch-b" aria-hidden="true">
              {headline} Set it.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
            Strangers attach a USDC stamp to reach you.{" "}
            <span className="text-foreground">Reply and they&apos;re refunded. Spam pays you.</span> Cold DMs and AI-agent blasts finally
            cost something. Real people pay nothing.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-lg px-6 font-display text-base tracking-wide uppercase" data-tour="open-inbox">
              <Link href="/setup">
                Open my inbox <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            {DEMO_INBOX && (
              <Button asChild size="lg" variant="outline" className="h-12 rounded-lg px-6 font-display text-base tracking-wide uppercase">
                <Link href={`/${DEMO_INBOX}`}>Try the demo inbox</Link>
              </Button>
            )}
          </div>
          <p className="mt-6 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Non-custodial · Immutable contract · No admin keys
          </p>
        </div>
        <HeroDemo />
      </section>

      <LiveStats />

      <section aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4">
        <p className="kicker">How it works</p>
        <h2 id="how-heading" className="mt-2 font-display text-4xl font-bold uppercase sm:text-5xl">
          Postage for your DMs
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="stamp-card p-6 py-8">
              <div className="flex h-28 items-center justify-center">{s.art}</div>
              <p className="mt-6 font-mono text-sm font-medium text-magenta-ink">{s.n}</p>
              <h3 className="mt-1 font-display text-2xl font-bold uppercase">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="arc-heading" className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="kicker">Why Arc</p>
          <h2 id="arc-heading" className="mt-2 font-display text-4xl font-bold uppercase sm:text-5xl">
            Money that moves like messages
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            A $1 refundable stamp only works where money is dollars, fees are cents and finality is instant.
          </p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {whyArc.map(({ icon: Icon, title, body }) => (
            <li key={title} className="panel p-6">
              <span className="inline-flex size-10 items-center justify-center rounded-md border border-cyan/30 bg-cyan/5">
                <Icon className="size-5 text-cyan-ink" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold uppercase">{title}</h3>
              <p className="mt-1.5 text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="agents-heading" className="mx-auto max-w-6xl px-4">
        <div className="panel grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="kicker">For AI agents</p>
            <h2 id="agents-heading" className="mt-2 font-display text-3xl font-bold uppercase sm:text-4xl">
              Agents pay to reach humans
            </h2>
            <p className="mt-3 text-muted-foreground">
              Outreach bots get a public quote API and a ready-to-sign transaction. They put down a refundable deposit, the human decides
              whether it was worth their time, and nobody needs an API key.
            </p>
            <Link href="/developers" className="mt-5 inline-flex items-center gap-1.5 font-mono text-sm text-cyan-ink underline-offset-4 hover:underline">
              Read the developer guide <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <pre
            tabIndex={0}
            aria-label="Example: quote a stamp, then send it"
            className="overflow-x-auto rounded-xl border border-border bg-background/60 p-4 font-mono text-xs leading-relaxed"
          >
            <span className="text-muted-foreground">{"// 1. quote + ready-to-sign tx"}</span>
            {'\nconst q = await fetch("/api/v1/stamp?to=@alice&message=Hi")\n  .then((r) => r.json());\n\n'}
            <span className="text-muted-foreground">{"// 2. pay in native USDC, final in <1s"}</span>
            {"\nawait wallet.sendTransaction({ ...q.tx, value: BigInt(q.tx.value) });"}
          </pre>
        </div>
      </section>

      <DemoInbox />

      <section aria-labelledby="cta-heading" className="mx-auto max-w-6xl px-4">
        <div className="panel relative overflow-hidden px-6 py-12 text-center sm:py-16">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_16rem_at_50%_0%,color-mix(in_srgb,var(--magenta)_16%,transparent),transparent)]"
            aria-hidden="true"
          />
          <h2 id="cta-heading" className="relative font-display text-3xl font-bold uppercase sm:text-5xl">
            Reply and they&apos;re refunded.
            <br />
            <span className="text-magenta-ink">Spam pays you.</span>
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-muted-foreground">Pick a price, share your link. Thirty seconds, one transaction.</p>
          <Button asChild size="lg" className="relative mt-8 h-12 rounded-lg px-7 font-display text-base tracking-wide uppercase">
            <Link href="/setup">
              Set your price <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <OnboardingTour />
    </div>
  );
}
