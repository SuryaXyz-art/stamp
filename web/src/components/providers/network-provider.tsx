"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_NETWORK, getNetworkConfig, type NetworkConfig } from "@/lib/config";
import type { NetworkKey } from "@/lib/chains";

const STORAGE_KEY = "stamp:network";
const listeners = new Set<() => void>();

function readStored(): NetworkKey {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "mainnet" || v === "testnet") return v;
  } catch {}
  return DEFAULT_NETWORK;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

type NetworkContextValue = NetworkConfig & { setNetwork: (key: NetworkKey) => void };

const NetworkContext = createContext<NetworkContextValue | null>(null);

/** The Arc network the app reads from and asks wallets to use. Switchable from the footer, remembered per browser. */
export function NetworkProvider({ children }: { children: ReactNode }) {
  const key = useSyncExternalStore(subscribe, readStored, () => DEFAULT_NETWORK);

  const setNetwork = useCallback((next: NetworkKey) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    listeners.forEach((l) => l());
  }, []);

  const value = useMemo(() => ({ ...getNetworkConfig(key), setNetwork }), [key, setNetwork]);
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used inside <NetworkProvider>");
  return ctx;
}
