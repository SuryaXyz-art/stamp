import { ImageResponse } from "next/og";
import { og, OG_SIZE, OgFrame, ogFonts, OgStamp } from "@/lib/og";

export const alt = "Stamp: your attention has a price. Set it.";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Site-wide social card. */
export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame aside={<OgStamp price="$1" />}>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 84, fontWeight: 700, lineHeight: 0.98, letterSpacing: -1 }}>
          <div style={{ display: "flex" }}>YOUR ATTENTION</div>
          <div style={{ display: "flex" }}>HAS A PRICE.</div>
          <div style={{ display: "flex", color: og.magenta }}>SET IT.</div>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 30, fontWeight: 500, color: og.muted }}>
          Reply and they&apos;re refunded. Spam pays you.
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
