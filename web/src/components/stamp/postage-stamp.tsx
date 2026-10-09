import { useId } from "react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { w: 64, h: 76, r: 3, gap: 9, price: "text-lg", label: "text-[7px]" },
  md: { w: 96, h: 114, r: 4, gap: 11, price: "text-3xl", label: "text-[8px]" },
  lg: { w: 156, h: 186, r: 5.5, gap: 14, price: "text-6xl", label: "text-[10px]" },
} as const;

function perforations(w: number, h: number, r: number, gap: number) {
  const holes: [number, number][] = [];
  const nx = Math.max(2, Math.round(w / gap));
  const ny = Math.max(2, Math.round(h / gap));
  for (let i = 0; i <= nx; i++) {
    const x = (i * w) / nx;
    holes.push([x, 0], [x, h]);
  }
  for (let j = 1; j < ny; j++) {
    const y = (j * h) / ny;
    holes.push([0, y], [w, y]);
  }
  return holes.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="black" />);
}

type Props = {
  /** Already formatted, e.g. "$1" */
  price: string;
  size?: keyof typeof sizes;
  tilt?: number;
  className?: string;
  label?: string;
};

/**
 * A neon postage stamp: real perforated edges (SVG mask), a magenta→cyan frame, engraved guilloche lines,
 * and the price in holographic foil. Decorative: always paired with visible or sr-only text by the caller.
 */
export function PostageStamp({ price, size = "md", tilt = -4, className, label = "USDC · ARC" }: Props) {
  const s = sizes[size];
  const id = useId().replace(/:/g, "");
  const inset = s.r + 3;
  return (
    <div
      className={cn("stamp-glow relative shrink-0 select-none", className)}
      style={{ width: s.w, height: s.h, transform: `rotate(${tilt}deg)` }}
      aria-hidden="true"
    >
      <svg width={s.w} height={s.h} viewBox={`0 0 ${s.w} ${s.h}`} className="absolute inset-0">
        <defs>
          <linearGradient id={`frame-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--magenta)" />
            <stop offset=".5" stopColor="var(--violet)" />
            <stop offset="1" stopColor="var(--cyan)" />
          </linearGradient>
          <pattern id={`lines-${id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--violet)" strokeOpacity=".16" strokeWidth="1" />
          </pattern>
          <mask id={`perf-${id}`}>
            <rect width={s.w} height={s.h} fill="white" />
            {perforations(s.w, s.h, s.r, s.gap)}
          </mask>
        </defs>
        <g mask={`url(#perf-${id})`}>
          <rect width={s.w} height={s.h} fill={`url(#frame-${id})`} />
          <rect x={inset} y={inset} width={s.w - 2 * inset} height={s.h - 2 * inset} rx={2} fill="var(--card)" />
          <rect x={inset} y={inset} width={s.w - 2 * inset} height={s.h - 2 * inset} rx={2} fill={`url(#lines-${id})`} />
          <rect
            x={inset + 3}
            y={inset + 3}
            width={s.w - 2 * (inset + 3)}
            height={s.h - 2 * (inset + 3)}
            rx={1}
            fill="none"
            stroke={`url(#frame-${id})`}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className={cn("foil font-display leading-none font-bold tracking-tight", s.price)}>{price}</span>
        <span className={cn("font-mono font-medium tracking-[0.2em] text-muted-foreground", s.label)}>{label}</span>
      </div>
    </div>
  );
}
