"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Identicon } from "@/components/stamp/identicon";
import { PostageStamp } from "@/components/stamp/postage-stamp";
import { Postmark, type StampStatus } from "@/components/stamp/postmark";

const scenes: { from: string; message: string; status: StampStatus; outcome: string }[] = [
  {
    from: "0x7a3e9b1c5d2f4a6e8b0c1d2e3f4a5b6c7d8e9f01",
    message: "Hi! Loved your talk on payments. Hiring a founding engineer. 20-minute chat this week?",
    status: "refunded",
    outcome: "+$1.00 returned to sender",
  },
  {
    from: "0x1f0e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c",
    message: "🚀 GM ser! Exclusive 100x presale, only for you. Send 0.5 ETH to claim your allocation…",
    status: "kept",
    outcome: "$1.00 kept by you: spam paid for your time",
  },
];

const reducedQuery = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const mq = matchMedia(reducedQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * Looping demo: an envelope arrives, the stamp lands, then the receiver's decision is postmarked.
 * Pure CSS animations (no animation library on the landing page); the global reduced-motion rule turns them off.
 */
export function HeroDemo() {
  // false on the server and during hydration, so both render the same markup.
  const reduce = useSyncExternalStore(subscribeReduced, () => matchMedia(reducedQuery).matches, () => false);
  const [scene, setScene] = useState(0);
  const [animStage, setStage] = useState<"arrive" | "pending" | "settled">("arrive");
  const stage = reduce ? "settled" : animStage;

  useEffect(() => {
    if (reduce) return;
    const timers = [
      setTimeout(() => setStage("pending"), 900),
      setTimeout(() => setStage("settled"), 2600),
      setTimeout(() => {
        setStage("arrive");
        setScene((s) => (s + 1) % scenes.length);
      }, 6200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [scene, reduce]);

  const s = scenes[scene];
  return (
    <div className="relative mx-auto w-full max-w-md" aria-label="Animated example of a stamped message" role="img" data-tour="demo">
      <div className="absolute inset-x-6 -bottom-3 h-full rotate-2 rounded-lg border border-violet/30 bg-card/60" aria-hidden="true" />
      <div className="absolute inset-x-12 -bottom-6 h-full -rotate-1 rounded-lg border border-cyan/20 bg-card/30" aria-hidden="true" />
      <div key={scene} className="stamp-card relative animate-[card-in_450ms_cubic-bezier(0.2,0.8,0.2,1)_both] p-6 py-8">
        <div className="flex items-start gap-3">
          <Identicon address={s.from} size={36} />
          <div className="flex-1">
            <p className="text-sm">
              <span className="kicker mr-1.5 text-muted-foreground">From</span>
              <span className="font-medium tabular">
                {s.from.slice(0, 6)}…{s.from.slice(-4)}
              </span>
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">just now</p>
          </div>
          <div className="-mt-3 -mr-2 animate-[stamp-drop_600ms_350ms_cubic-bezier(0.3,1.5,0.5,1)_both]">
            <PostageStamp price="$1" size="md" tilt={4} />
          </div>
        </div>
        <p className="mt-4 pr-6 text-[15px] leading-relaxed">{s.message}</p>
        <div className="mt-6 flex h-[72px] items-center gap-4">
          {stage !== "arrive" && (
            <div key={stage} className="-rotate-8">
              <Postmark status={stage === "pending" ? "pending" : s.status} size={72} ink />
            </div>
          )}
          {stage === "settled" && (
            <p
              className={`animate-in fade-in-0 slide-in-from-left-2 font-mono text-sm font-medium duration-300 ${s.status === "refunded" ? "text-lime-ink" : "text-magenta-ink"}`}
            >
              {s.outcome}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
