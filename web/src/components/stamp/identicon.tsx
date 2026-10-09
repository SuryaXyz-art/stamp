import { cn } from "@/lib/utils";

/** Deterministic 5x5 mirrored blockie, generated from the address: neon cells on a deep tinted tile. No dependency, no network. */
export function Identicon({ address, size = 40, className }: { address: string; size?: number; className?: string }) {
  const hex = address.toLowerCase().replace(/^0x/, "").padEnd(40, "0");
  const byte = (i: number) => parseInt(hex.slice((i * 2) % 40, (i * 2) % 40 + 2), 16);
  const hue = Math.round((byte(0) / 255) * 360);
  const hue2 = (hue + 40 + (byte(1) % 80)) % 360;
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (byte(2 + y * 3 + x) % 2 === 0) {
        cells.push({ x, y });
        if (x < 2) cells.push({ x: 4 - x, y });
      }
    }
  }
  return (
    <svg
      viewBox="-0.5 -0.5 6 6"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md ring-1 ring-border", className)}
      style={{ background: `hsl(${hue2} 55% 14%)` }}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} fill={`hsl(${hue} 100% 62%)`} />
      ))}
    </svg>
  );
}
