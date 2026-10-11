"use client";

import { ChevronDown, Inbox, LogOut, Send, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { Avatar } from "@/components/stamp/avatar";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-profile";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-context";

const item =
  "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none select-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground";

/** Signed-in header control: avatar + handle and the account menu. Loaded only once someone is signed in. */
export default function AccountMenu({ className }: { className?: string }) {
  const auth = useAuth();
  const { data: me } = useMe();
  if (!auth.address) return null;
  const name = me?.handle ? `@${me.handle}` : shortAddress(auth.address);
  return (
    // Non-modal: a modal menu aria-hides the rest of the page while its links stay focusable (axe: aria-hidden-focus).
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" className={cn("h-9 gap-2 rounded-lg pr-2.5 pl-1.5", className)} aria-label={`Account ${name}, open menu`}>
          <Avatar address={auth.address} src={me?.avatarUrl} size={24} />
          <span className="max-w-32 truncate font-mono text-sm">{name}</span>
          <ChevronDown aria-hidden="true" className="opacity-60" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="panel z-50 w-56 p-1.5 shadow-[var(--shadow-lift)]">
          <DropdownMenu.Label className="px-2.5 pt-1.5 pb-2 font-mono text-xs text-muted-foreground">{shortAddress(auth.address, 6)}</DropdownMenu.Label>
          {me?.handle && (
            <DropdownMenu.Item asChild className={item}>
              <Link href={`/@${me.handle}`}>
                <UserRound className="size-4" aria-hidden="true" /> Public profile
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item asChild className={item}>
            <Link href="/inbox">
              <Inbox className="size-4" aria-hidden="true" /> Inbox
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={item}>
            <Link href="/sent">
              <Send className="size-4" aria-hidden="true" /> Sent
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={item}>
            <Link href="/settings">
              <Settings className="size-4" aria-hidden="true" /> Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className={cn(item, "text-magenta-ink")} onSelect={() => auth.logout()}>
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
