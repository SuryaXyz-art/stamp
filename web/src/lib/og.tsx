import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import type { Address } from "viem";
import { stampBoxAbi } from "@/generated/stampBoxAbi";
import { getPublicClient } from "./clients";
import { DEFAULT_NETWORK, getNetworkConfig } from "./config";
import { formatStampPrice, shortAddress } from "./format";

/** Shared look for every generated social card (1200x630): Neon Postal colours, self-hosted fonts. */

export const OG_SIZE = { width: 1200, height: 630 };

export const og = {
  bg: "#07060B",
  surface: "#0E0C16",
  surface2: "#15121F",
  text: "#F3F0FF",
  muted: "#A9A3C0",
  magenta: "#FF2BD6",
  cyan: "#00F0FF",
  lime: "#C6FF00",
  violet: "#8B5CFF",
  edge: "linear-gradient(135deg, #FF2BD6 0%, #8B5CFF 50%, #00F0FF 100%)",
};

const fontDir = join(process.cwd(), "assets", "fonts");

export async function ogFonts() {
  const [bold, medium, mono] = await Promise.all([
    readFile(join(fontDir, "ChakraPetch-Bold.ttf")),
    readFile(join(fontDir, "ChakraPetch-Medium.ttf")),
    readFile(join(fontDir, "JetBrainsMono-Medium.ttf")),
  ]);
  return [
    { name: "Chakra Petch", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Chakra Petch", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "JetBrains Mono", data: mono, weight: 500 as const, style: "normal" as const },
  ];
}

/** Perforation holes along all four edges, drawn in the page colour (satori has no masks or dotted borders). */
function holes(width: number, height: number, r: number, gap: number) {
  const out: { x: number; y: number }[] = [];
  const nx = Math.round(width / gap);
  const ny = Math.round(height / gap);
  for (let i = 0; i <= nx; i++) out.push({ x: (i * width) / nx, y: 0 }, { x: (i * width) / nx, y: height });
  for (let j = 1; j < ny; j++) out.push({ x: 0, y: (j * height) / ny }, { x: width, y: (j * height) / ny });
  return out.map((h, i) => (
    <div
      key={i}
      style={{ position: "absolute", left: h.x - r, top: h.y - r, width: r * 2, height: r * 2, borderRadius: r, background: og.bg }}
    />
  ));
}

/** The perforated neon stamp with a price, as satori-compatible markup. */
export function OgStamp({ price, label = "USDC · ARC", width = 330 }: { price: string; label?: string; width?: number }) {
  const height = Math.round(width * 1.18);
  const fontSize = price.length > 4 ? Math.round(width * 0.27) : Math.round(width * 0.38);
  return (
    <div style={{ display: "flex", position: "relative", width, height, padding: 22, background: og.edge, transform: "rotate(5deg)" }}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: og.surface,
          border: `2px solid ${og.violet}66`,
        }}
      >
        <div style={{ display: "flex", fontFamily: "Chakra Petch", fontWeight: 700, fontSize, color: og.magenta, lineHeight: 1 }}>{price}</div>
        <div style={{ display: "flex", marginTop: 14, fontFamily: "JetBrains Mono", fontSize: Math.round(width * 0.06), letterSpacing: 5, color: og.muted }}>
          {label}
        </div>
      </div>
      {holes(width, height, 9, 26)}
    </div>
  );
}

/** Background, grid, gradient hairline and the wordmark; content goes on the left, `aside` on the right. */
export function OgFrame({ children, aside, footer }: { children: ReactNode; aside?: ReactNode; footer?: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: og.bg,
        backgroundImage: `radial-gradient(circle at 85% 0%, ${og.violet}40, transparent 55%), radial-gradient(circle at 0% 20%, ${og.magenta}26, transparent 50%), linear-gradient(${og.violet}14 1px, transparent 1px), linear-gradient(90deg, ${og.violet}14 1px, transparent 1px)`,
        backgroundSize: "100% 100%, 100% 100%, 40px 40px, 40px 40px",
        color: og.text,
        fontFamily: "Chakra Petch",
      }}
    >
      <div style={{ display: "flex", height: 6, background: og.edge }} />
      <div style={{ display: "flex", flex: 1, padding: "56px 72px" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, paddingRight: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", width: 34, height: 40, padding: 5, background: og.edge, transform: "rotate(-6deg)" }}>
              <div style={{ display: "flex", flex: 1, background: og.bg }} />
            </div>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 700, letterSpacing: 6 }}>STAMP</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
          <div style={{ display: "flex", fontFamily: "JetBrains Mono", fontSize: 22, letterSpacing: 3, color: og.cyan }}>
            {footer ?? "REPLY = REFUND · SPAM PAYS · USDC ON ARC"}
          </div>
        </div>
        {aside && <div style={{ display: "flex", alignItems: "center" }}>{aside}</div>}
      </div>
    </div>
  );
}

async function readInbox(address: Address) {
  const net = getNetworkConfig(DEFAULT_NETWORK);
  if (!net.stampBox) return null;
  try {
    const client = getPublicClient(DEFAULT_NETWORK);
    const [price, bio] = await Promise.all([
      client.readContract({ address: net.stampBox, abi: stampBoxAbi, functionName: "priceOf", args: [address] }),
      client.readContract({ address: net.stampBox, abi: stampBoxAbi, functionName: "bioOf", args: [address] }),
    ]);
    return { price, bio };
  } catch {
    return null;
  }
}

/** Share card for one inbox: headline (or a default), who it is, and their stamp price on a neon stamp. */
export async function inboxCard({ address, name }: { address: Address | null; name?: string }) {
  const inbox = address ? await readInbox(address) : null;
  const price = inbox && inbox.price > 0n ? formatStampPrice(inbox.price) : "$1";
  const headline = inbox?.bio || "Message me. Reply = refund.";
  const who = [name, address ? shortAddress(address) : "Stamp inbox"].filter(Boolean).join(" · ");
  return new ImageResponse(
    (
      <OgFrame aside={<OgStamp price={price} />}>
        <div style={{ display: "flex", fontFamily: "JetBrains Mono", fontSize: 26, letterSpacing: 4, color: og.cyan }}>MESSAGE ME ON STAMP</div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 64, fontWeight: 700, lineHeight: 1.04 }}>{headline.slice(0, 90)}</div>
        <div style={{ display: "flex", marginTop: 22, fontFamily: "JetBrains Mono", fontSize: 28, color: og.muted }}>{who}</div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  );
}
