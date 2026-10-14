import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Inter, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import { BottomNav } from "@/components/layout/bottom-nav";
import { NeonBackdrop } from "@/components/layout/neon-backdrop";
import { NetworkBanner } from "@/components/layout/network-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Providers } from "@/components/providers/providers";
import { themeInitScript } from "@/components/providers/theme-provider";
import { SITE_URL } from "@/lib/config";
import "./globals.css";

// Body text paints immediately in a size-matched fallback (next/font adjustFontFallback), so Inter isn't preloaded:
// the headline's display font is the one the first paint waits for.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", preload: false });
// One display weight: semibold text renders with the 700 face, and every extra file competes with the headline.
const chakra = Chakra_Petch({ subsets: ["latin"], weight: "700", variable: "--font-chakra", display: "swap" });
// Mono is for addresses and amounts, mostly below the fold: don't preload it.
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Stamp: a refundable paid inbox on Arc", template: "%s · Stamp" },
  description:
    "Your attention has a price. Set it. Strangers attach a USDC stamp to reach you: reply and they're refunded, mark it spam and you keep it. Built on Arc.",
  openGraph: { siteName: "Stamp", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#07060b",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Set per request by src/proxy.ts; reading it opts every page into dynamic rendering, which nonces require.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // "dark" is the server default; themeInitScript swaps it before paint if the visitor chose light.
    <html lang="en" className={`dark ${inter.variable} ${chakra.variable} ${mono.variable}`} style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="relative isolate flex min-h-dvh flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
        <NeonBackdrop />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:font-medium focus:shadow-lg"
        >
          Skip to content
        </a>
        <Providers>
          <NetworkBanner />
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
