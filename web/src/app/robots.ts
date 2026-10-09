import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/** Public pages are fine to index; the mailbox views are per-wallet and useless to crawlers. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/inbox", "/sent", "/setup"] }],
    host: SITE_URL,
  };
}
