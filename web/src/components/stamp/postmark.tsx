import { useId } from "react";
import { cn } from "@/lib/utils";

export type StampStatus = "pending" | "refunded" | "kept" | "reclaimed";

export const statusFromIndex: StampStatus[] = ["pending", "refunded", "kept", "reclaimed"];

const styles: Record<StampStatus, { text: string; color: string; dashed?: boolean }> = {
  pending: { text: "PENDING", color: "var(--muted-foreground)", dashed: true },
  refunded: { text: "REFUNDED ✓", color: "var(--success)" },
  kept: { text: "KEPT · SPAM", color: "var(--stamp-ink)" },
  reclaimed: { text: "RECLAIMED", color: "var(--amber)" },
};

export const statusLabel: Record<StampStatus, string> = {
  pending: "Pending",
  refunded: "Refunded",
  kept: "Kept as spam",
  reclaimed: "Reclaimed by sender",
};

/** A round ink postmark showing a stamp's settlement state. */
export function Postmark({
  status,
  date,
  size = 92,
  className,
}: {
  status: StampStatus;
  date?: string;
  size?: number;
  className?: string;
}) {
  const s = styles[status];
  const id = useId().replace(/:/g, "");
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={statusLabel[status]}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="overflow-visible">
        <defs>
          <path id={`arc-${id}`} d="M 18 50 A 32 32 0 1 1 82 50" />
          <filter id={`ink-${id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" />
          </filter>
        </defs>
        <g filter={`url(#ink-${id})`} style={{ color: s.color }} opacity={0.9}>
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={s.dashed ? "5 4" : undefined} />
          <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray={s.dashed ? "3 3" : undefined} />
          <text fontSize="9.5" fontWeight={700} letterSpacing="1.5" fill="currentColor">
            <textPath href={`#arc-${id}`} startOffset="50%" textAnchor="middle">
              STAMP · ARC
            </textPath>
          </text>
          <text x="50" y="56" textAnchor="middle" fontSize={s.text.length > 9 ? 9.5 : 11} fontWeight={800} letterSpacing="0.5" fill="currentColor">
            {s.text}
          </text>
          {date && (
            <text x="50" y="70" textAnchor="middle" fontSize="7" fontWeight={600} letterSpacing="0.8" fill="currentColor">
              {date}
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
