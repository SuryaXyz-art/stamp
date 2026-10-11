"use client";

import { Dialog } from "radix-ui";
import { Wallet, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { createConfig, http, injected, useAccount, useConnect, useConnectors, useDisconnect, useSwitchChain, WagmiProvider } from "wagmi";
import { Button } from "@/components/ui/button";
import { arcMainnet, arcTestnet } from "@/lib/chains";
import { getNetworkConfig } from "@/lib/config";
import { rememberSignedIn, useAuthShell, type AuthApi } from "./auth-context";

/**
 * Fallback when NEXT_PUBLIC_PRIVY_APP_ID isn't set: browser-extension wallets only (MetaMask, Rabby, OKX, Coinbase
 * extension… anything announcing itself via EIP-6963). Sending and settling stamps work; accounts (handles,
 * settings) need Privy and stay hidden.
 */

const config = createConfig({
  chains: [arcTestnet, arcMainnet],
  connectors: [injected()],
  ssr: true,
  transports: {
    [arcTestnet.id]: http(getNetworkConfig("testnet").rpcUrl, { batch: true }),
    [arcMainnet.id]: http(getNetworkConfig("mainnet").rpcUrl, { batch: true }),
  },
});

function WalletPicker({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const connectors = useConnectors();
  const { connectAsync, isPending } = useConnect();
  // EIP-6963 wallets announce themselves by name; the generic "Injected" entry is only useful when none did.
  const named = connectors.filter((c) => c.id !== "injected");
  const list = named.length ? named : connectors;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" />
        <Dialog.Content className="panel fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 p-6 shadow-[var(--shadow-lift)]">
          <Dialog.Title className="font-display text-2xl font-bold uppercase">Connect a wallet</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">Pick the browser wallet that should send and receive stamps.</Dialog.Description>
          <ul className="mt-5 space-y-2">
            {list.map((c) => (
              <li key={c.uid}>
                <Button
                  variant="outline"
                  className="h-12 w-full justify-start gap-3 rounded-lg px-4 text-base"
                  disabled={isPending}
                  onClick={async () => {
                    try {
                      await connectAsync({ connector: c });
                      onOpenChange(false);
                    } catch (err) {
                      const code = (err as { code?: number }).code;
                      if (code !== 4001) toast.error("Couldn't connect", { description: (err as Error).message });
                    }
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- wallet icons are data: URIs from the extension */}
                  {c.icon ? <img src={c.icon} alt="" className="size-6 rounded" /> : <Wallet aria-hidden="true" />}
                  {c.id === "injected" ? "Browser wallet" : c.name}
                </Button>
              </li>
            ))}
          </ul>
          {!list.length && <p className="mt-4 text-sm text-muted-foreground">No browser wallet found. Install MetaMask or Rabby, then reload.</p>}
          <Dialog.Close asChild>
            <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" aria-label="Close">
              <XIcon aria-hidden="true" />
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Bridge({ children }: { children: ReactNode }) {
  const shell = useAuthShell();
  const { address, chainId, isConnected, status } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const [picker, setPicker] = useState(false);
  const ready = status !== "connecting" && status !== "reconnecting";

  useEffect(() => {
    if (ready) rememberSignedIn(isConnected);
  }, [ready, isConnected]);

  // A "Sign in" click that happened before this chunk loaded opens the picker as soon as we're ready.
  const { pendingLogin, clearPendingLogin } = shell;
  const pickerOpen = picker || (ready && pendingLogin && !isConnected);
  const setPickerOpen = useCallback(
    (v: boolean) => {
      setPicker(v);
      if (!v) clearPendingLogin();
    },
    [clearPendingLogin],
  );

  const logout = useCallback(async () => {
    await disconnectAsync();
    rememberSignedIn(false);
  }, [disconnectAsync]);

  const value = useMemo<AuthApi>(
    () => ({
      mode: "wallet",
      ready,
      authenticated: isConnected,
      address,
      chainId,
      embedded: false,
      login: () => setPicker(true),
      logout,
      getAccessToken: async () => null,
      refreshSession: async () => {},
      link: () => setPicker(true),
      linked: address ? [{ type: "wallet", label: address }] : [],
      switchChain: async (id) => {
        await switchChainAsync({ chainId: id as typeof arcTestnet.id });
      },
    }),
    [ready, isConnected, address, chainId, logout, switchChainAsync],
  );

  const { setApi } = shell;
  useEffect(() => {
    setApi(value);
  }, [setApi, value]);
  useEffect(() => () => setApi(null), [setApi]);

  return (
    <>
      {children}
      <WalletPicker open={pickerOpen} onOpenChange={setPickerOpen} />
    </>
  );
}

export default function InjectedRuntime({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <Bridge>{children}</Bridge>
    </WagmiProvider>
  );
}
