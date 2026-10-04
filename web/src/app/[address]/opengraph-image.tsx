import { ImageResponse } from "next/og";
import { createPublicClient, getAddress, http, isAddress } from "viem";
import { stampBoxAbi } from "@/generated/stampBoxAbi";
import { DEFAULT_NETWORK, getNetworkConfig } from "@/lib/config";
import { formatStampPrice, shortAddress } from "@/lib/format";

export const alt = "Message me on Stamp";
export const size = { width: 1200, height: 630 };
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

/** Dynamic share card for /[address]: the receiver's headline and their stamp price as a big red stamp. */
export default async function Image({ params }: { params: Promise<{ address: string }> }) {
  const { address: raw } = await params;
  const address = isAddress(raw) ? getAddress(raw) : null;
  const inbox = address ? await readInbox(address) : null;
  const price = inbox && inbox.price > 0n ? formatStampPrice(inbox.price) : "$1";
  const headline = inbox?.bio || "Message me. Reply = refund.";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#FAF7F2", padding: 72, fontFamily: "Georgia, serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, paddingRight: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 40, color: "#0F1B2D" }}>
            <div style={{ width: 34, height: 40, background: "#E5484D", borderRadius: 3, transform: "rotate(-6deg)" }} />
            Stamp
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 64, lineHeight: 1.05, color: "#0F1B2D", display: "flex" }}>{headline.slice(0, 90)}</div>
            <div style={{ fontSize: 30, color: "#556070", fontFamily: "sans-serif", display: "flex" }}>
              {address ? shortAddress(address) : "Stamp inbox"} · Reply = refund · Spam pays
            </div>
          </div>
          <div style={{ fontSize: 26, color: "#1D5FA8", fontFamily: "sans-serif", display: "flex" }}>USDC on Arc</div>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 330,
              height: 390,
              background: "#FFFDF9",
              border: "10px dotted #FAF7F2",
              boxShadow: "0 30px 60px -20px rgba(15,27,45,0.35)",
              transform: "rotate(5deg)",
              display: "flex",
              padding: 14,
            }}
          >
            <div
              style={{
                flex: 1,
                background: "#E5484D",
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: 130, display: "flex" }}>{price}</div>
              <div style={{ fontSize: 22, letterSpacing: 6, fontFamily: "sans-serif", display: "flex" }}>USDC · ARC</div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
