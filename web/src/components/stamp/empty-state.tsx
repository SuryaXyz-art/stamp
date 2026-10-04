import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** An empty, open envelope. Used for every empty list. */
function EmptyEnvelope() {
  return (
    <svg width="132" height="96" viewBox="0 0 132 96" aria-hidden="true" className="text-muted-foreground">
      <rect x="6" y="22" width="120" height="70" rx="8" fill="var(--card)" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" />
      <path d="M6 30 66 66l60-36" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" />
      <path d="M6 30 66 4l60 26" fill="var(--muted)" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="4 4" />
      <rect x="98" y="32" width="18" height="22" rx="1.5" fill="var(--stamp)" opacity=".25" transform="rotate(6 107 43)" />
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
    <div className={cn("flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center", className)}>
      <EmptyEnvelope />
      <h2 className="mt-5 font-serif text-2xl">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
