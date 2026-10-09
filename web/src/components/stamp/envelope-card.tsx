"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Identicon } from "./identicon";
import { PostageStamp } from "./postage-stamp";
import { Postmark, type StampStatus } from "./postmark";
import { formatStampPrice, shortAddress, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  id?: bigint;
  counterparty: string;
  /** "From" in the inbox, "To" in sent */
  direction: "from" | "to";
  amount: bigint;
  sentAt: number;
  status: StampStatus;
  message?: string;
  reply?: string;
  selected?: boolean;
  focused?: boolean;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** One message = one envelope: counterparty, time, stamp with the amount, postmark with the status. */
export function EnvelopeCard({
  id,
  counterparty,
  direction,
  amount,
  sentAt,
  status,
  message,
  reply,
  selected,
  focused,
  leading,
  actions,
  className,
}: Props) {
  // Ink the postmark only when the status changes while on screen (a settle), not on first render.
  const [initialStatus] = useState(status);
  return (
    <article
      className={cn(
        "stamp-card p-4 py-6 transition-[background,transform] duration-200 sm:px-6 sm:py-7",
        selected && "[--fill:color-mix(in_srgb,var(--cyan)_7%,var(--card))]",
        focused && "shadow-[inset_3px_0_0_var(--cyan),inset_0_0_0_1px_var(--cyan)] [--edge:linear-gradient(135deg,var(--cyan),var(--magenta))]",
        className,
      )}
      aria-label={`Stamp ${direction} ${counterparty}`}
    >
      <div className="flex items-start gap-3">
        {leading}
        <Identicon address={counterparty} size={36} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="kicker mr-1.5 text-muted-foreground">{direction === "from" ? "From" : "To"}</span>
            <Link href={`/${counterparty}`} className="font-medium tabular hover:underline underline-offset-4">
              {shortAddress(counterparty)}
            </Link>
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            <time dateTime={new Date(sentAt * 1000).toISOString()} title={new Date(sentAt * 1000).toLocaleString()}>
              {timeAgo(sentAt)}
            </time>
            {id !== undefined && (
              <>
                {" · "}
                <Link href={`/stamp/${id}`} className="hover:underline underline-offset-4">
                  #{id.toString()}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="relative -mt-2 -mr-1 sm:-mt-3">
          <PostageStamp price={formatStampPrice(amount)} size="sm" tilt={3} />
          <Postmark
            key={status}
            status={status}
            ink={status !== initialStatus}
            size={62}
            className="pointer-events-none absolute -bottom-5 -left-8 -rotate-8 sm:-left-10"
          />
        </div>
      </div>

      <div className="mt-4 pr-2 sm:pr-16">
        {message === undefined ? (
          <div className="space-y-2" aria-label="Loading message">
            <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-3/5 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{message}</p>
        )}
        {reply && (
          <div className="mt-4 rounded-lg border border-lime/30 bg-lime/5 px-4 py-3">
            <p className="kicker mb-1 text-lime-ink">Reply</p>
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{reply}</p>
          </div>
        )}
      </div>

      {actions && <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div>}
    </article>
  );
}
