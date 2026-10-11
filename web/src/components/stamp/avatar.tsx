import Image from "next/image";
import { cn } from "@/lib/utils";
import { Identicon } from "./identicon";

/**
 * Profile picture from X/Discord when the user picked one, otherwise the address identicon. Remote images go
 * through Next's optimizer (/_next/image), so browsers never contact X or Discord directly.
 */
export function Avatar({ address, src, size = 40, className }: { address: string; src?: string | null; size?: number; className?: string }) {
  if (!src) return <Identicon address={address} size={size} className={className} />;
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md object-cover ring-1 ring-border", className)}
      style={{ width: size, height: size }}
    />
  );
}
