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

/** Shareable link, QR code, "Share on X", and the embeddable "Message me" badge. */
export function SharePanel({ address, price, handle }: { address: Address; price: bigint; handle?: string | null }) {
  const origin = useSyncExternalStore(() => () => {}, getOrigin, () => SITE_URL);
  const link = handle ? `${origin}/@${handle}` : `${origin}/${address}`;
  const tweet = encodeURIComponent(
    `My inbox now has a price: ${formatStampPrice(price)} in USDC on Arc. Genuine messages get refunded; spam pays me.\n\nMessage me with a stamp 👇\n${link}`,
  );
  const badge = `${origin}/badge/${handle ?? address}`;
  const markdown = `[![Message me on Stamp](${badge})](${link})`;
  const html = `<a href="${link}"><img src="${badge}" alt="Message me on Stamp" height="24"></a>`;

  return (
    <div className="space-y-8">
      <div>
        <p className="kicker">Your link</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <code className="flex min-h-11 flex-1 items-center rounded-lg border border-cyan/30 bg-background px-4 py-2 font-mono text-sm break-all text-cyan-ink">
            {link.replace(/^https?:\/\//, "")}
          </code>
          <CopyButton value={link} label="Copy link" className="h-11 rounded-xl" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="rounded-lg bg-white p-3 shadow-[0_0_0_1px_var(--violet),0_0_24px_-6px_var(--violet)]">
          <QRCodeSVG value={link} size={148} fgColor="#120E1F" bgColor="#FFFFFF" level="M" title="QR code for your inbox link" />
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
        <p className="text-sm font-medium">“Message me” badge</p>
        <p className="mt-1 text-xs text-muted-foreground">Shows your live price. Paste it in a GitHub README, your site or an email signature.</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- live SVG from our own badge route */}
        <img src={badge} alt="Message me on Stamp badge preview" height={24} className="mt-3 h-6 w-auto" />
        <div className="mt-3 space-y-2">
          {[
            ["Markdown", markdown],
            ["HTML", html],
          ].map(([label, code]) => (
            <div key={label} className="flex items-start gap-2">
              <pre
                tabIndex={0}
                aria-label={`${label} badge code`}
                className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-dashed border-border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground"
              >
                {code}
              </pre>
              <CopyButton value={code} label={`Copy ${label}`} className="h-9 shrink-0 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
