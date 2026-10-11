import { BadgeCheck } from "lucide-react";
import type { Badge } from "@/lib/server/users";
import { cn } from "@/lib/utils";

const label = { twitter: "X", discord: "Discord", github: "GitHub" } as const;

/** Accounts the owner proved by signing in with them (via Privy), shown only when they chose to. */
export function VerifiedBadges({ badges, className }: { badges: Badge[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Verified accounts">
      {badges.map((b) => {
        const inner = (
          <>
            <BadgeCheck className="size-3.5 text-cyan-ink" aria-hidden="true" />
            <span className="text-muted-foreground">{label[b.type]}</span>
            <span>{b.type === "discord" ? b.username : `@${b.username}`}</span>
          </>
        );
        const cls = "inline-flex items-center gap-1.5 rounded-md border border-cyan/30 bg-cyan/5 px-2 py-1 font-mono text-xs";
        return (
          <li key={b.type}>
            {b.url ? (
              <a href={b.url} target="_blank" rel="noopener noreferrer me" className={cn(cls, "hover:border-cyan/70")} title={`Verified ${label[b.type]} account`}>
                {inner}
              </a>
            ) : (
              <span className={cls} title={`Verified ${label[b.type]} account`}>
                {inner}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
