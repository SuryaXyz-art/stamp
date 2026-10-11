"use client";

import { Component, createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import type { Address } from "viem";
import { PRIVY_APP_ID } from "@/lib/config";

/**
 * Auth without the weight. This module is tiny and safe to import anywhere. The real runtime (Privy + wagmi, or a
 * wallet-only fallback when Privy isn't configured) is a separate chunk loaded only when needed:
 * a page that uses a wallet asks for it, the visitor clicks "Sign in", or they were signed in last time.
 */

export type LinkableAccount = "twitter" | "discord" | "google" | "email" | "passkey" | "wallet";

export type AuthApi = {
  /** "privy": social/email/passkey + wallets. "wallet": browser wallets only (no Privy app id configured). */
  mode: "privy" | "wallet";
  /** The SDK has finished restoring any previous session. */
  ready: boolean;
  authenticated: boolean;
  /** The wallet that signs transactions right now. */
  address?: Address;
  chainId?: number;
  embedded: boolean;
  login: () => void;
  logout: () => Promise<void>;
  /** Fresh Privy access token for API calls (null in wallet mode or when signed out). */
  getAccessToken: () => Promise<string | null>;
  /** Re-sync the server session after linking/unlinking an account. */
  refreshSession: () => Promise<void>;
  link: (account: LinkableAccount) => void;
  unlink?: (account: LinkableAccount) => Promise<void>;
  /** Accounts Privy says are linked (for the settings page). */
  linked: { type: LinkableAccount; label: string }[];
  exportWallet?: () => Promise<void>;
  switchChain: (chainId: number) => Promise<void>;
};

type RuntimeStatus = "idle" | "loading" | "ready" | "error";

const HINT_KEY = "stamp:signed-in";

type Shell = {
  status: RuntimeStatus;
  /** Load the runtime (no-op once loaded). With `then: "login"`, opens sign-in as soon as it's ready. */
  load: (then?: "login") => void;
  api: AuthApi | null;
  setApi: (api: AuthApi | null) => void;
  pendingLogin: boolean;
  clearPendingLogin: () => void;
  /** The runtime gave up (e.g. the SDK never became ready). */
  fail: (reason: string) => void;
};

const ShellContext = createContext<Shell | null>(null);

export const mode: AuthApi["mode"] = PRIVY_APP_ID ? "privy" : "wallet";

type RuntimeComponent = ComponentType<{ children: ReactNode }>;
const importRuntime = () => (PRIVY_APP_ID ? import("./privy-runtime") : import("./injected-runtime")).then((m) => m.default as RuntimeComponent);

export function rememberSignedIn(on: boolean) {
  try {
    if (on) localStorage.setItem(HINT_KEY, "1");
    else localStorage.removeItem(HINT_KEY);
  } catch {}
}

/**
 * If the auth SDK throws while rendering (bad app id, a provider outage…), keep the site up: render the page
 * without the runtime and report "error" so gates can say sign-in is unavailable.
 */
class RuntimeBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onError: (err: unknown) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    this.props.onError(err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const noSubscribe = () => () => {};
const readHint = () => {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
};

export function AuthShell({ children }: { children: ReactNode }) {
  const [requested, setRequested] = useState(false);
  const [Runtime, setRuntime] = useState<RuntimeComponent | null>(null);
  const [api, setApi] = useState<AuthApi | null>(null);
  const [pendingLogin, setPendingLogin] = useState(false);
  const [failed, setFailed] = useState(false);
  // Returning visitors (signed in last time) get their account back without clicking anything.
  // Server snapshot is false, so the first client render matches the server HTML.
  const hint = useSyncExternalStore(noSubscribe, readHint, () => false);
  const wanted = requested || hint;
  const status: RuntimeStatus = failed ? "error" : Runtime ? "ready" : wanted ? "loading" : "idle";

  const fail = useCallback((reason: string) => {
    console.error(`[auth] ${reason}`);
    setFailed(true);
  }, []);

  const load = useCallback((then?: "login") => {
    if (then === "login") setPendingLogin(true);
    setRequested(true);
  }, []);

  // Fetch the runtime chunk once. Until it arrives the page keeps rendering without it (no blank flash);
  // when it does, the tree re-mounts inside the wallet providers.
  useEffect(() => {
    if (!wanted || Runtime) return;
    let live = true;
    importRuntime()
      .then((C) => live && setRuntime(() => C))
      .catch((err) => {
        console.error("[auth] couldn't load the sign-in runtime", err);
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [wanted, Runtime]);

  const shell = useMemo<Shell>(
    () => ({
      status,
      load,
      api,
      setApi,
      pendingLogin,
      clearPendingLogin: () => setPendingLogin(false),
      fail,
    }),
    [status, load, api, pendingLogin, fail],
  );

  return (
    <ShellContext.Provider value={shell}>
      {Runtime && !failed ? (
        <RuntimeBoundary
          fallback={children}
          onError={(err) => {
            console.error("[auth] sign-in runtime crashed", err);
            setFailed(true);
          }}
        >
          <Runtime>{children}</Runtime>
        </RuntimeBoundary>
      ) : (
        children
      )}
    </ShellContext.Provider>
  );
}

function useShell(): Shell {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthShell>");
  return ctx;
}

/** Internal: lets the runtime publish its API and consume a pending "Sign in" click. */
export const useAuthShell = useShell;

const idle = (load: Shell["load"]): AuthApi => ({
  mode,
  ready: false,
  authenticated: false,
  embedded: false,
  login: () => load("login"),
  logout: async () => {},
  getAccessToken: async () => null,
  refreshSession: async () => {},
  link: () => load(),
  linked: [],
  switchChain: async () => {},
});

/** Always safe to call. Before the runtime loads it reports "not signed in" and `login()` loads it. */
export function useAuth(): AuthApi & { runtime: RuntimeStatus } {
  const shell = useShell();
  return { ...(shell.api ?? idle(shell.load)), runtime: shell.status };
}

/** For pages that need wallet hooks: starts loading the runtime; true once the wallet providers wrap the page. */
export function useRequireRuntime(): boolean {
  const { status, load } = useShell();
  useEffect(() => load(), [load]);
  return status === "ready";
}

/** True when the sign-in runtime failed to load or crashed (pages show a notice instead of waiting forever). */
export function useRuntimeFailed(): boolean {
  return useShell().status === "error";
}
