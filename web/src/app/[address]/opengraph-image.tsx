import { getAddress, isAddress } from "viem";
import { inboxCard, OG_SIZE } from "@/lib/og";

export const alt = "Message me on Stamp";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

/** Dynamic share card for /[address]. */
export default async function Image({ params }: { params: Promise<{ address: string }> }) {
  const { address: raw } = await params;
  return inboxCard({ address: isAddress(raw) ? getAddress(raw) : null });
}
