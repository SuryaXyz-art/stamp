import { NextResponse, type NextRequest } from "next/server";
import { getNetworkConfig, PRIVY_APP_ID, WALLETCONNECT_PROJECT_ID } from "@/lib/config";
import { buildCsp, createNonce } from "@/lib/security-headers";

const rpcUrls = [getNetworkConfig("mainnet").rpcUrl, getNetworkConfig("testnet").rpcUrl];

/** Fresh CSP nonce per page request. Next.js reads it from the request's CSP header and stamps its own scripts. */
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    rpcUrls,
    walletConnect: Boolean(WALLETCONNECT_PROJECT_ID),
    privy: Boolean(PRIVY_APP_ID),
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: skip API routes, static assets, generated images and link prefetches.
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|.*opengraph-image).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
