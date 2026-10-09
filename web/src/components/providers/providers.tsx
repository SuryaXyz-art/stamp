"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { darkTheme, lightTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { WagmiProvider } from "wagmi";
import { TooltipProvider } from "@/components/ui/tooltip";
import { wagmiConfig } from "@/lib/wagmi";
import { NetworkProvider, useNetwork } from "./network-provider";
import { ThemeProvider, useTheme } from "./theme-provider";

// Neon Postal wallet modal. Hex values mirror the tokens in globals.css (RainbowKit needs literal colours).
const rkShared = { borderRadius: "medium", fontStack: "system", overlayBlur: "small" } as const;
const rkLight = lightTheme({ ...rkShared, accentColor: "#C2109F", accentColorForeground: "#FFFFFF" });
const rkDark = darkTheme({ ...rkShared, accentColor: "#FF2BD6", accentColorForeground: "#07060B" });
rkLight.colors.modalBackground = "#FFFFFF";
rkLight.colors.modalBorder = "#D9D2EF";
rkDark.colors.modalBackground = "#0E0C16";
rkDark.colors.modalBorder = "#2A2540";
rkDark.colors.modalText = "#F3F0FF";
rkDark.colors.modalTextSecondary = "#A9A3C0";
rkDark.colors.actionButtonSecondaryBackground = "#15121F";
rkDark.colors.generalBorder = "#2A2540";
rkDark.colors.menuItemBackground = "#15121F";
rkDark.colors.closeButtonBackground = "#15121F";
rkDark.colors.connectButtonBackground = "#0E0C16";
rkDark.shadows.dialog = "0 0 0 1px #8B5CFF55, 0 24px 64px -16px #000, 0 0 48px -12px #FF2BD655";
rkDark.fonts.body = "var(--font-inter), ui-sans-serif, system-ui, sans-serif";
rkLight.fonts.body = rkDark.fonts.body;

function Wallet({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const { chain } = useNetwork();
  return (
    <RainbowKitProvider theme={theme === "dark" ? rkDark : rkLight} initialChain={chain} modalSize="compact">
      {children}
      <Toaster
        theme={theme}
        position="bottom-right"
        richColors={false}
        closeButton
        toastOptions={{ className: "stamp-toast" }}
      />
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: true, retry: 2 } } }),
  );
  return (
    <ThemeProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <NetworkProvider>
            <TooltipProvider delayDuration={200}>
              <Wallet>{children}</Wallet>
            </TooltipProvider>
          </NetworkProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
