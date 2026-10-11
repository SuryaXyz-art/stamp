"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthShell } from "@/components/wallet/auth-context";
import { NetworkProvider } from "./network-provider";
import { ThemeProvider, useTheme } from "./theme-provider";

function Toasts() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="bottom-right" richColors={false} closeButton toastOptions={{ className: "stamp-toast" }} />;
}

/**
 * Everything every page needs, and nothing heavy: the wallet/auth runtime is loaded on demand by <AuthShell>.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: true, retry: 2 } } }),
  );
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>
          <TooltipProvider delayDuration={200}>
            <AuthShell>{children}</AuthShell>
            <Toasts />
          </TooltipProvider>
        </NetworkProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
