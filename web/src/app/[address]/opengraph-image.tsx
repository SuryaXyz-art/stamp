import { ImageResponse } from "next/og";
import { createPublicClient, getAddress, http, isAddress } from "viem";
import { stampBoxAbi } from "@/generated/stampBoxAbi";
import { DEFAULT_NETWORK, getNetworkConfig } from "@/lib/config";
import { formatStampPrice, shortAddress } from "@/lib/format";
import { og, OG_SIZE, OgFrame, ogFonts, OgStamp } from "@/lib/og";

export const alt = "Message me on Stamp";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

async function readInbox(address: `0x${string}`) {
  const net = getNetworkConfig(DEFAULT_NETWORK);
  if (!net.stampBox) return null;
  try {
    const client = createPublicClient({ chain: net.chain, transport: http(net.rpcUrl) });
    const [price, bio] = await Promise.all([
      client.readContract({ address: net.stampBox, abi: stampBoxAbi, functionName: "priceOf", args: [address] }),
      client.readContract({ address: net.stampBox, abi: stampBoxAbi, functionName: "bioOf", args: [address] }),
    ]);
    return { price, bio };
  } catch {
    return null;
  }
}

/** Dynamic share card for /[address]: the receiver's headline and their stamp price on a neon stamp. */
export default async function Image({ params }: { params: Promise<{ address: string }> }) {
  const { address: raw } = await params;
  const address = isAddress(raw) ? getAddress(raw) : null;
  const inbox = address ? await readInbox(address) : null;
  const price = inbox && inbox.price > 0n ? formatStampPrice(inbox.price) : "$1";
  const headline = inbox?.bio || "Message me. Reply = refund.";

  return new ImageResponse(
    (
      <OgFrame aside={<OgStamp price={price} />}>
        <div style={{ display: "flex", fontFamily: "JetBrains Mono", fontSize: 26, letterSpacing: 4, color: og.cyan }}>MESSAGE ME ON STAMP</div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 64, fontWeight: 700, lineHeight: 1.04 }}>{headline.slice(0, 90)}</div>
        <div style={{ display: "flex", marginTop: 22, fontFamily: "JetBrains Mono", fontSize: 28, color: og.muted }}>
          {address ? shortAddress(address) : "Stamp inbox"}
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
