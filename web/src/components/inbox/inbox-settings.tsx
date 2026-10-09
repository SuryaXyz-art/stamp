"use client";

import { useId, useState } from "react";
import { PricePicker } from "@/components/setup/price-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStampTx } from "@/hooks/use-stamp-tx";
import type { InboxInfo } from "@/hooks/use-stampbox";
import { byteLength, formatStampPrice } from "@/lib/format";

/** Settings drawer: change price, edit headline, open/close the inbox. */
export function InboxSettings({ open, onOpenChange, info }: { open: boolean; onOpenChange: (v: boolean) => void; info: InboxInfo }) {
  const { run, busy } = useStampTx();
  const [price, setPrice] = useState<bigint | undefined>(info.open ? info.price : undefined);
  const [bio, setBio] = useState(info.bio);
  const [confirmClose, setConfirmClose] = useState(false);
  const bioId = useId();

  const bioChanged = bio.trim() !== info.bio;
  const priceChanged = price !== undefined && price !== info.price;

  async function save() {
    if (!price) return;
    try {
      // openInbox updates both fields (and reopens a closed inbox); setPrice is cheaper when only the price moved.
      if (bioChanged || !info.open) {
        await run({ functionName: "openInbox", args: [price, bio.trim()], labels: { pending: "Saving inbox settings", success: "Settings saved ✓" } });
      } else {
        await run({ functionName: "setPrice", args: [price], labels: { pending: `Setting price to ${formatStampPrice(price)}`, success: "Price updated ✓" } });
      }
      onOpenChange(false);
    } catch {}
  }

  async function close() {
    try {
      await run({ functionName: "closeInbox", labels: { pending: "Closing your inbox", success: "Inbox closed" } });
      setConfirmClose(false);
      onOpenChange(false);
    } catch {}
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto bg-card sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-3xl font-bold">Inbox settings</SheetTitle>
          <SheetDescription>Changes apply to new stamps only. Pending stamps keep the amount they were sent with.</SheetDescription>
        </SheetHeader>
        <div className="space-y-8 px-4 pb-8">
          <div>
            <p className="mb-3 text-sm font-medium">Stamp price</p>
            <PricePicker value={price} onChange={setPrice} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={bioId}>Headline</Label>
            <Input id={bioId} value={bio} onChange={(e) => setBio(e.target.value)} className="h-11 rounded-xl bg-background" />
            <p className="text-right text-xs text-muted-foreground tabular">{byteLength(bio)} / 160</p>
          </div>
          <Button
            className="h-11 w-full rounded-xl"
            onClick={save}
            disabled={busy || !price || byteLength(bio) > 160 || (info.open && !bioChanged && !priceChanged)}
          >
            {info.open ? "Save changes" : "Reopen inbox"}
          </Button>

          {info.open && (
            <div className="rounded-2xl border border-stamp/30 p-4">
              <p className="font-medium">Close inbox</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Stop accepting new stamps. You can still settle everything that&apos;s pending, and reopen anytime.
              </p>
              {confirmClose ? (
                <div className="mt-3 flex gap-2">
                  <Button variant="destructive" onClick={close} disabled={busy}>
                    Yes, close it
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmClose(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="mt-3" onClick={() => setConfirmClose(true)}>
                  Close inbox…
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
