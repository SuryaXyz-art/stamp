"use client";

import { ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useSyncExternalStore } from "react";
import type { Address } from "viem";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/config";
import { formatStampPrice } from "@/lib/format";

const getOrigin = () => window.location.origin;

/** Shareable link, QR code, "Share on X", and a preview of the v2 embed snippet. */
export function SharePanel({ address, price }: { address: Address; price: bigint }) {
  const origin = useSyncExternalStore(() => () => {}, getOrigin, () => SITE_URL);
  const link = `${origin}/${address}`;
  const tweet = encodeURIComponent(
    `My inbox now has a price: ${formatStampPrice(price)} in USDC on Arc. Genuine messages get refunded; spam pays me.\n\nMessage me with a stamp 👇\n${link}`,
  );
  const embed = `<a href="${link}" data-stamp-button>Message me with Stamp</a>\n<script src="${origin}/embed.js" async></script>`;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium">Your link</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <code className="flex min-h-11 flex-1 items-center rounded-xl border border-border bg-background px-4 py-2 text-sm break-all">
            {link.replace(/^https?:\/\//, "")}
          </code>
          <CopyButton value={link} label="Copy link" className="h-11 rounded-xl" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="rounded-2xl border border-border bg-white p-3" aria-label="QR code for your inbox link" role="img">
          <QRCodeSVG value={link} size={148} fgColor="#0F1B2D" bgColor="#FFFFFF" level="M" />
        </div>
        <div className="w-full flex-1 space-y-3">
          <Button asChild className="h-11 w-full rounded-xl">
            <a href={`https://x.com/intent/post?text=${tweet}`} target="_blank" rel="noopener">
              Share on X <ExternalLink aria-hidden="true" />
            </a>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full rounded-xl">
            <a href={link} target="_blank" rel="noopener">
              Preview your send page
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">Tip: put the link in your X bio, email signature, or GitHub profile.</p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Embed a “Message me” button</p>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">v2 · coming soon</span>
        </div>
        <pre className="mt-2 overflow-x-auto rounded-xl border border-dashed border-border bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">
          {embed}
        </pre>
      </div>
    </div>
  );
}
