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

const rkShared = { borderRadius: "large", fontStack: "system" } as const;
const rkLight = lightTheme({ ...rkShared, accentColor: "#0F1B2D", accentColorForeground: "#FAF7F2" });
const rkDark = darkTheme({ ...rkShared, accentColor: "#F2EDE4", accentColorForeground: "#0B0F17" });
rkLight.colors.modalBackground = "#FFFDF9";
rkDark.colors.modalBackground = "#121826";

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
