"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "stamp:tour-done";

const steps = [
  {
    target: "demo",
    title: "Every message carries a stamp",
    body: "Strangers attach a little USDC to reach you. Reply and it goes back to them. Mark it spam and you keep it.",
  },
  {
    target: "open-inbox",
    title: "Open your own inbox",
    body: "Pick a price, share your link. Takes 30 seconds and one transaction.",
  },
  {
    target: "network",
    title: "Try it free on testnet",
    body: "Switch to Testnet down here and grab free test USDC from Circle's faucet. Nothing real is spent.",
  },
] as const;

type Rect = { top: number; left: number; width: number; height: number };

/** A three-step, dismissible first-visit tour. Anchors to elements with matching data-tour attributes. */
export function OnboardingTour() {
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    let done = true;
    try {
      done = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {}
    if (done) return;
    const t = setTimeout(() => setStep(0), 1200);
    return () => clearTimeout(t);
  }, []);

  const finish = useCallback(() => {
    setStep(null);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }, []);

  useLayoutEffect(() => {
    if (step === null) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${steps[step].target}"]`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const update = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height });
    };
    update();
    const t = setTimeout(update, 400);
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", update);
    };
  }, [step]);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, finish]);

  if (step === null || !rect) return null;
  const s = steps[step];
  const last = step === steps.length - 1;
  const cardWidth = Math.min(320, typeof window !== "undefined" ? window.innerWidth - 32 : 320);
  const below = rect.top - window.scrollY < window.innerHeight / 2;
  const left = Math.max(16, Math.min(rect.left + rect.width / 2 - cardWidth / 2, window.innerWidth - cardWidth - 16));
  const top = below ? rect.top + rect.height + 14 : rect.top - 14;

  return (
    <AnimatePresence>
      {/* Positioned with transforms, not top/left, so moving to the next anchor isn't a layout shift. */}
      <div
        className="pointer-events-none absolute top-0 left-0 z-40 rounded-xl shadow-[0_0_24px_var(--cyan)] ring-2 ring-cyan ring-offset-4 ring-offset-background transition-transform duration-300"
        style={{ transform: `translate(${rect.left}px, ${rect.top}px)`, width: rect.width, height: rect.height }}
        aria-hidden="true"
      />
      <div
        className="absolute top-0 left-0 z-50"
        style={{ transform: `translate(${left}px, ${top}px)${below ? "" : " translateY(-100%)"}`, width: cardWidth }}
      >
        <motion.div
          key={step}
          role="dialog"
          aria-modal="false"
          aria-labelledby="tour-title"
          initial={{ opacity: 0, y: below ? -6 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="panel relative p-5 shadow-[var(--shadow-lift)]"
        >
          <button onClick={finish} className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Close tour">
            <X className="size-4" />
          </button>
          <p className="kicker">
            {step + 1} of {steps.length}
          </p>
          <h2 id="tour-title" className="mt-1 font-display text-xl font-bold uppercase">
            {s.title}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
          <div className="mt-4 flex items-center justify-between">
            <button onClick={finish} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Skip tour
            </button>
            <Button size="sm" onClick={() => (last ? finish() : setStep(step + 1))} autoFocus>
              {last ? "Got it" : "Next"}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
