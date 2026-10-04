"use client";

import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/wallet/connect-button";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const nav = [
  { href: "/inbox", label: "Inbox" },
  { href: "/sent", label: "Sent" },
  { href: "/setup", label: "Open inbox" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  return (
    <header className="border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4">
        <Link href="/" className="mr-auto rounded-lg" aria-label="Stamp home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground",
                pathname === item.href && "bg-muted text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
        <ConnectButton label="Connect" />
      </div>
      <nav aria-label="Main mobile" className="flex border-t border-border/70 sm:hidden">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            className={cn(
              "flex-1 py-2.5 text-center text-sm text-muted-foreground",
              pathname === item.href && "font-medium text-foreground shadow-[inset_0_-2px_0_var(--stamp)]",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
