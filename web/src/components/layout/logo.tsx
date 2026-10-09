import { useId } from "react";
import { cn } from "@/lib/utils";

/** Perforated neon stamp mark. Decorative; pair with the wordmark or an aria-label. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const h = Math.round(size * (32 / 28));
  return (
    <svg width={size} height={h} viewBox="0 0 28 32" aria-hidden="true" className={cn("-rotate-6 shrink-0", className)}>
      <defs>
        <linearGradient id={`lg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--magenta)" />
          <stop offset=".55" stopColor="var(--violet)" />
          <stop offset="1" stopColor="var(--cyan)" />
        </linearGradient>
        <mask id={`lm-${id}`}>
          <rect width="28" height="32" fill="white" />
          {[0, 7, 14, 21, 28].map((x) => [<circle key={`t${x}`} cx={x} cy={0} r={1.9} />, <circle key={`b${x}`} cx={x} cy={32} r={1.9} />])}
          {[6.4, 12.8, 19.2, 25.6].map((y) => [<circle key={`l${y}`} cx={0} cy={y} r={1.9} />, <circle key={`r${y}`} cx={28} cy={y} r={1.9} />])}
        </mask>
      </defs>
      <g mask={`url(#lm-${id})`}>
        <rect width="28" height="32" fill={`url(#lg-${id})`} />
        <rect x="3.5" y="3.5" width="21" height="25" rx="1" fill="var(--background)" />
      </g>
      <text x="14" y="21.5" textAnchor="middle" fontSize="15" fontWeight={700} fontFamily="var(--font-display)" fill={`url(#lg-${id})`}>
        $
      </text>
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-xl leading-none font-bold tracking-[0.12em] uppercase">Stamp</span>
    </span>
  );
}
