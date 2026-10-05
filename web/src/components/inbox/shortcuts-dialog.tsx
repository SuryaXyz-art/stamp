"use client";

import { XIcon } from "lucide-react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";

const shortcuts: [keys: string[], action: string][] = [
  [["J", "↓"], "Next message"],
  [["K", "↑"], "Previous message"],
  [["X"], "Select / deselect"],
  [["R"], "Reply & refund"],
  [["S"], "Spam: keep the stamp"],
  [["Esc"], "Close the reply box"],
  [["Ctrl", "Enter"], "Send reply"],
  [["?"], "Show this help"],
];

/** Keyboard shortcuts for the inbox. Opened with "?" or the keyboard button. */
export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 motion-reduce:animate-none">
          <Dialog.Title className="font-serif text-2xl">Keyboard shortcuts</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">Work through your inbox without the mouse.</Dialog.Description>
          <dl className="mt-5 space-y-2.5 text-sm">
            {shortcuts.map(([keys, action]) => (
              <div key={action} className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{action}</dt>
                <dd className="flex gap-1">
                  {keys.map((k) => (
                    <kbd key={k} className="min-w-7 rounded-md border border-border bg-muted px-1.5 py-0.5 text-center font-sans text-xs">
                      {k}
                    </kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <Dialog.Close asChild>
            <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" aria-label="Close">
              <XIcon aria-hidden="true" />
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
