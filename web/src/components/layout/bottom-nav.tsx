"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

/** Phone-only tab bar, pinned to the bottom with safe-area padding. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors",
                  active && "text-foreground",
                )}
              >
                {active && (
                  <span
                    className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-magenta shadow-[0_0_12px_var(--magenta)]"
                    aria-hidden="true"
                  />
                )}
                <Icon className={cn("size-5", active && "text-magenta-ink")} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
