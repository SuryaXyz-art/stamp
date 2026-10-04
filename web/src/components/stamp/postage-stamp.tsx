import { useId } from "react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { w: 64, h: 76, r: 3, gap: 9, price: "text-lg", label: "text-[8px]" },
  md: { w: 96, h: 114, r: 4, gap: 11, price: "text-3xl", label: "text-[9px]" },
  lg: { w: 156, h: 186, r: 5.5, gap: 14, price: "text-6xl", label: "text-[11px]" },
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
 * A postage stamp with real perforated edges (SVG mask), a slight tilt, and the price as the denomination.
 * Decorative: always paired with visible or sr-only text by the caller.
 */
export function PostageStamp({ price, size = "md", tilt = -4, className, label = "USDC · ARC" }: Props) {
  const s = sizes[size];
  const id = useId().replace(/:/g, "");
  return (
    <div
      className={cn("stamp-glow relative shrink-0 select-none", className)}
      style={{ width: s.w, height: s.h, transform: `rotate(${tilt}deg)` }}
      aria-hidden="true"
    >
      <svg width={s.w} height={s.h} viewBox={`0 0 ${s.w} ${s.h}`} className="absolute inset-0 drop-shadow-sm">
        <defs>
          <mask id={`perf-${id}`}>
            <rect width={s.w} height={s.h} fill="white" />
            {perforations(s.w, s.h, s.r, s.gap)}
          </mask>
        </defs>
        <g mask={`url(#perf-${id})`}>
          <rect width={s.w} height={s.h} fill="var(--card)" />
          <rect
            x={s.r + 3}
            y={s.r + 3}
            width={s.w - 2 * (s.r + 3)}
            height={s.h - 2 * (s.r + 3)}
            rx={2}
            fill="var(--stamp)"
          />
          <rect
            x={s.r + 6}
            y={s.r + 6}
            width={s.w - 2 * (s.r + 6)}
            height={s.h - 2 * (s.r + 6)}
            rx={1}
            fill="none"
            stroke="white"
            strokeOpacity={0.45}
            strokeWidth={1}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-white">
        <span className={cn("font-serif leading-none tabular", s.price)}>{price}</span>
        <span className={cn("font-semibold tracking-[0.18em] opacity-90", s.label)}>{label}</span>
      </div>
    </div>
  );
}
