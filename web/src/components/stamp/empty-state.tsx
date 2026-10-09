import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** An empty, open envelope in neon wireframe. Used for every empty list. */
function EmptyEnvelope() {
  return (
    <svg width="132" height="96" viewBox="0 0 132 96" aria-hidden="true" className="overflow-visible">
      <rect x="6" y="22" width="120" height="70" rx="6" fill="var(--card)" stroke="var(--violet)" strokeOpacity=".55" strokeWidth="1.5" />
      <path d="M6 30 66 66l60-36" fill="none" stroke="var(--violet)" strokeOpacity=".55" strokeWidth="1.5" />
      <path d="M6 30 66 4l60 26" fill="var(--muted)" stroke="var(--cyan)" strokeOpacity=".7" strokeWidth="1.5" strokeDasharray="4 4" />
      <rect
        x="98"
        y="32"
        width="18"
        height="22"
        rx="1.5"
        fill="none"
        stroke="var(--magenta)"
        strokeWidth="1.5"
        strokeDasharray="2 2.5"
        transform="rotate(6 107 43)"
        className="dark:drop-shadow-[0_0_6px_var(--magenta)]"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center", className)}>
      <EmptyEnvelope />
      <h2 className="mt-6 font-display text-2xl font-bold tracking-wide uppercase">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
