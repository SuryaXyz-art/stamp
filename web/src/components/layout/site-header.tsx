"use client";

import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { AccountButton } from "@/components/wallet/account-button";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { navItems } from "./nav-items";

export function SiteHeader() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-30 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4">
        <Link href="/" className="mr-auto rounded-lg" aria-label="Stamp home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          {navItems
            .filter((item) => item.show !== "mobile")
            .map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative rounded-md px-3 py-2 font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground",
                    active && "text-foreground",
                  )}
                >
                  {item.label}
                  {active && (
                    <span
                      className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-magenta shadow-[0_0_10px_var(--magenta)]"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
        </nav>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
        <AccountButton />
      </div>
      <div className="h-px bg-[image:var(--edge)] opacity-60" aria-hidden="true" />
    </header>
  );
}
