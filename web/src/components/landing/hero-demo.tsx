"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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

/** Looping demo: an envelope arrives, the stamp lands, then the receiver's decision is postmarked. */
const noSubscribe = () => () => {};

export function HeroDemo() {
  // useReducedMotion is already known on the client's first render, but the server can't know it. Ignore it until
  // hydration is done (server snapshot = false), otherwise the markup differs and React throws away the whole tree.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const reduce = useReducedMotion() && hydrated;
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
      <AnimatePresence mode="wait">
        <motion.div
          key={scene}
          initial={reduce ? false : { y: 24, opacity: 0, rotate: -1.5 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ x: 80, opacity: 0, rotate: 3 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          className="stamp-card relative p-6 py-8"
        >
          <div className="flex items-start gap-3">
            <Identicon address={s.from} size={36} />
            <div className="flex-1">
              <p className="text-sm">
                <span className="kicker mr-1.5 text-muted-foreground">From</span>
                <span className="font-medium tabular">{s.from.slice(0, 6)}…{s.from.slice(-4)}</span>
              </p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">just now</p>
            </div>
            <motion.div
              initial={reduce ? false : { y: -60, rotate: -25, opacity: 0, scale: 1.3 }}
              animate={{ y: 0, rotate: 4, opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 380, damping: 18 }}
              className="-mt-3 -mr-2"
            >
              <PostageStamp price="$1" size="md" tilt={0} />
            </motion.div>
          </div>
          <p className="mt-4 pr-6 text-[15px] leading-relaxed">{s.message}</p>
          <div className="mt-6 flex h-[72px] items-center gap-4">
            <AnimatePresence mode="wait">
              {stage !== "arrive" && (
                <motion.div
                  key={stage}
                  initial={reduce ? false : { scale: 1.8, opacity: 0, rotate: -18 }}
                  animate={{ scale: 1, opacity: 1, rotate: -8 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 520, damping: 20 }}
                >
                  <Postmark status={stage === "pending" ? "pending" : s.status} size={72} />
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {stage === "settled" && (
                <motion.p
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={`font-mono text-sm font-medium ${s.status === "refunded" ? "text-lime-ink" : "text-magenta-ink"}`}
                >
                  {s.outcome}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
