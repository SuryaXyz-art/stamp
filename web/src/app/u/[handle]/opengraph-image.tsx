import { inboxCard, OG_SIZE } from "@/lib/og";
import { profileByHandle } from "@/lib/server/profiles";

export const alt = "Message me on Stamp";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

/** Dynamic share card for /@handle. */
export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await profileByHandle(decodeURIComponent(handle));
  return inboxCard({ address: profile?.address ?? null, name: profile ? profile.displayName || `@${profile.handle}` : undefined });
}
