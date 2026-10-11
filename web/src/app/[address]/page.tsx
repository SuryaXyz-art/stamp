import type { Metadata } from "next";
import { getAddress, isAddress } from "viem";
import { SendPage } from "@/components/send/send-page";
import { EmptyState } from "@/components/stamp/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { shortAddress } from "@/lib/format";
import { profileByAddress } from "@/lib/server/profiles";

export async function generateMetadata({ params }: PageProps<"/[address]">): Promise<Metadata> {
  const { address } = await params;
  if (!isAddress(address)) return { title: "Inbox not found" };
  const short = shortAddress(getAddress(address));
  return {
    title: `Message ${short}`,
    description: `Send ${short} a message with a refundable USDC stamp on Arc. Reply = refund.`,
  };
}

export default async function Page({ params }: PageProps<"/[address]">) {
  const { address } = await params;
  if (!isAddress(address)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title="That's not an inbox address"
          description="Stamp links look like stamp.app/0x… followed by 40 characters. Double-check the link you were sent."
          action={
            <Button asChild variant="outline">
              <Link href="/">Back home</Link>
            </Button>
          }
        />
      </div>
    );
  }
  // Inboxes with a handle live at /@handle; old /0x… links keep working by redirecting there.
  const profile = await profileByAddress(address);
  if (profile?.handle) redirect(`/@${profile.handle}`);
  return <SendPage to={getAddress(address)} />;
}
