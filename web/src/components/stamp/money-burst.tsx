"use client";

import { motion, useReducedMotion } from "motion/react";

/** A light "money returned" burst: a few green coins float up and fade. Purely decorative. */
export function MoneyBurst() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const coins = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI - Math.PI; // upper half-circle
    return { x: Math.cos(angle) * (50 + (i % 3) * 18), y: Math.sin(angle) * (60 + (i % 4) * 14), d: i * 0.025 };
  });
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible" aria-hidden="true">
      {coins.map((c, i) => (
        <motion.span
          key={i}
          className="absolute flex size-6 items-center justify-center rounded-full bg-lime font-mono text-xs font-bold text-black shadow-[0_0_12px_var(--lime)]"
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
          animate={{ x: c.x, y: c.y, scale: 1, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.9, delay: c.d, ease: "easeOut" }}
        >
          $
        </motion.span>
      ))}
    </div>
  );
}
