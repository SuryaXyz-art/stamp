import Link from "next/link";
import { PostageStamp } from "@/components/stamp/postage-stamp";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <PostageStamp price="404" size="lg" tilt={-5} label="RETURN TO SENDER" />
      <p className="kicker mt-10">Undeliverable</p>
      <h1 className="mt-2 font-display text-4xl font-bold uppercase sm:text-5xl">Return to sender</h1>
      <p className="mt-3 max-w-sm text-muted-foreground">No mailbox at this address. The link may be mistyped, or the page moved.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-11 rounded-lg px-5">
          <Link href="/">Back home</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-11 rounded-lg px-5">
          <Link href="/inbox">Open my inbox</Link>
        </Button>
      </div>
    </div>
  );
}
