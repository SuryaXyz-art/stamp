import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SendPage } from "@/components/send/send-page";
import { profileByHandle } from "@/lib/server/profiles";

/** Public inbox at /@handle (rewritten here by next.config.ts). */

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const profile = await profileByHandle(decodeURIComponent(handle));
  if (!profile) return { title: "Inbox not found" };
  const name = profile.displayName || `@${profile.handle}`;
  return {
    title: `Message ${name}`,
    description: `Send ${name} a message with a refundable USDC stamp on Arc. Reply = refund.`,
    alternates: { canonical: `/@${profile.handle}` },
  };
}

export default async function Page({ params }: PageProps<"/u/[handle]">) {
  const { handle } = await params;
  const profile = await profileByHandle(decodeURIComponent(handle));
  if (!profile) notFound();
  return <SendPage to={profile.address} profile={profile} />;
}
