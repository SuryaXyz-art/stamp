"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Identicon } from "@/components/stamp/identicon";
import { PostageStamp } from "@/components/stamp/postage-stamp";
import { useInboxInfo } from "@/hooks/use-stampbox";
import { DEMO_INBOX } from "@/lib/config";
import { formatStampPrice, shortAddress } from "@/lib/format";

/** The founder's permanent demo inbox: "Send me a stamp, I'll refund you." */
export function DemoInbox() {
  const { data } = useInboxInfo(DEMO_INBOX);
  if (!DEMO_INBOX) return null;
  return (
    <section aria-labelledby="demo-heading" className="mx-auto max-w-6xl px-4">
      <div className="stamp-card flex flex-col items-start gap-6 p-6 py-9 sm:flex-row sm:items-center sm:p-10">
        <div className="flex-1">
          <p className="kicker">Demo inbox</p>
          <h2 id="demo-heading" className="mt-2 font-display text-3xl font-bold uppercase sm:text-4xl">
            Send me a stamp. I&apos;ll refund you.
          </h2>
          <p className="mt-2 max-w-lg text-muted-foreground">
            Say hi to the builder of Stamp. I reply to every genuine message, so your USDC comes straight back, and you get to see
            the whole flow end to end.
          </p>
          <div className="mt-5 flex items-center gap-3 text-sm">
            <Identicon address={DEMO_INBOX} size={28} />
            <span className="tabular text-muted-foreground">{shortAddress(DEMO_INBOX)}</span>
            {data?.bio && <span className="hidden truncate text-muted-foreground sm:inline">· {data.bio}</span>}
          </div>
        </div>
        <div className="flex items-center gap-6 self-stretch sm:flex-col sm:self-auto">
          <PostageStamp price={data?.open ? formatStampPrice(data.price) : "$1"} size="md" tilt={5} />
          <Button asChild size="lg" className="h-11 rounded-lg px-5 font-display tracking-wide uppercase">
            <Link href={`/${DEMO_INBOX}`}>
              Try the demo inbox <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
