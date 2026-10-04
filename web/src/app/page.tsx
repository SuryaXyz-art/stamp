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
    title: "Only USDC. No second gas token.",
    body: "Arc pays gas in USDC, so a sender needs exactly one thing in their wallet: dollars.",
  },
  {
    icon: BadgeDollarSign,
    title: "A $1 stamp actually makes sense",
    body: "Fees are tiny and dollar-denominated. On most chains the gas would cost more than the stamp itself.",
  },
  {
    icon: Zap,
    title: "Sub-second finality",
    body: "Deterministic finality in under a second means sending a stamp feels like sending a DM. Delivered ✓, instantly.",
  },
  {
    icon: MousePointerClick,
    title: "One click, no approvals",
    body: "The stamp rides along as native USDC in msg.value. No approve-then-transfer dance, no allowances to revoke.",
  },
];

export default function Home() {
  return (
    <div className="space-y-24 pb-8 sm:space-y-32">
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-stamp" aria-hidden="true" />
            A refundable paid inbox on Arc
          </p>
          <h1 className="mt-6 font-serif text-5xl leading-[1.02] tracking-tight text-balance sm:text-7xl">
            Your inbox has a price. <em className="text-stamp-ink">Real people pay nothing.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
            Strangers attach a small USDC stamp to message you. Reply and they get it back. Mark it spam and you keep it. Cold
            DMs and AI-agent spam suddenly cost something, and genuine people pay nothing.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-xl px-6 text-base" data-tour="open-inbox">
              <Link href="/setup">
                Open my inbox <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            {DEMO_INBOX && (
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-6 text-base">
                <Link href={`/${DEMO_INBOX}`}>Try the demo inbox</Link>
              </Button>
            )}
          </div>
        </div>
        <HeroDemo />
      </section>

      <LiveStats />

      <section aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4">
        <h2 id="how-heading" className="font-serif text-4xl sm:text-5xl">
          How it works
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          <li className="envelope p-6 pt-8">
            <div className="flex h-28 items-center justify-center">
              <PostageStamp price="$1" size="md" tilt={-6} />
            </div>
            <p className="mt-6 text-sm font-medium text-muted-foreground">Step 1</p>
            <h3 className="mt-1 font-serif text-2xl">Send with a stamp</h3>
            <p className="mt-2 text-muted-foreground">
              A stranger writes to your link and attaches your price in USDC. It sits in the contract, not with you.
            </p>
          </li>
          <li className="envelope p-6 pt-8">
            <div className="flex h-28 items-center justify-center">
              <Postmark status="pending" size={100} />
            </div>
            <p className="mt-6 text-sm font-medium text-muted-foreground">Step 2</p>
            <h3 className="mt-1 font-serif text-2xl">You review</h3>
            <p className="mt-2 text-muted-foreground">
              Messages land in your inbox, sorted, with the stamp on every envelope. Keyboard shortcuts make inbox zero quick.
            </p>
          </li>
          <li className="envelope p-6 pt-8">
            <div className="flex h-28 items-center justify-center gap-2">
              <Postmark status="refunded" size={88} className="-rotate-6" />
              <Postmark status="kept" size={88} className="rotate-6" />
            </div>
            <p className="mt-6 text-sm font-medium text-muted-foreground">Step 3</p>
            <h3 className="mt-1 font-serif text-2xl">Refunded or kept</h3>
            <p className="mt-2 text-muted-foreground">
              Reply and the stamp goes back. Spam and you keep it. Ignore it for 7 days and the sender can reclaim it.
            </p>
          </li>
        </ol>
      </section>

      <section aria-labelledby="arc-heading" className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <h2 id="arc-heading" className="font-serif text-4xl sm:text-5xl">
            Why Arc
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            A $1 refundable stamp only works on a chain where money is dollars, fees are cents, and finality is instant.
          </p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {whyArc.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-paper)]">
              <Icon className="size-6 text-usdc-ink" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <DemoInbox />
      <OnboardingTour />
    </div>
  );
}
