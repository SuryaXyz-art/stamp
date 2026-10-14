import type { Metadata } from "next";
import { getAddress, isAddress } from "viem";
import { SendPage } from "@/components/send/send-page";
import { notFound, redirect } from "next/navigation";
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
  // Anything that isn't an address (typos, stray paths like /wp-admin) gets the real 404 page and status.
  if (!isAddress(address)) notFound();
  // Inboxes with a handle live at /@handle; old /0x… links keep working by redirecting there.
  const profile = await profileByAddress(address);
  if (profile?.handle) redirect(`/@${profile.handle}`);
  return <SendPage to={getAddress(address)} />;
}
