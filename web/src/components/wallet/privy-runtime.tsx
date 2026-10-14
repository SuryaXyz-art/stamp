"use client";

import {
  getIdentityToken,
  PrivyProvider,
  useCreateWallet,
  useExportWallet,
  useLinkAccount,
  useLogin,
  usePrivy,
  type PrivyClientConfig,
  type User,
} from "@privy-io/react-auth";
import { createConfig, WagmiProvider } from "@privy-io/wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { http, useAccount, useSwitchChain } from "wagmi";
import { useNetwork } from "@/components/providers/network-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { useFeatures } from "@/hooks/use-profile";
import { api, type PrivateProfile } from "@/lib/api-client";
import { arcMainnet, arcTestnet } from "@/lib/chains";
import { getNetworkConfig, PRIVY_APP_ID, SITE_URL, WALLETCONNECT_PROJECT_ID } from "@/lib/config";
import { rememberSignedIn, useAuthShell, type AuthApi } from "./auth-context";

/**
 * Privy: whichever of X, Discord, Google, email OTP, passkeys and external wallets the dashboard enables;
 * social/email users get an embedded wallet.
 * Arc is a custom chain (https://docs.privy.io/basics/react/advanced/configuring-evm-networks).
 * Wagmi goes through @privy-io/wagmi so both stay in sync (https://docs.privy.io/wallets/connectors/ethereum/integrations/wagmi).
 */

const wagmiConfig = createConfig({
  chains: [arcTestnet, arcMainnet],
  transports: {
    [arcTestnet.id]: http(getNetworkConfig("testnet").rpcUrl, { batch: true }),
    [arcMainnet.id]: http(getNetworkConfig("mainnet").rpcUrl, { batch: true }),
  },
});

function privyConfig(theme: "light" | "dark", defaultChainId: number): PrivyClientConfig {
  return {
    // No `loginMethods`: the modal shows exactly what's enabled in the Privy dashboard (X, Discord, Google, email,
    // passkey, wallet). Listing one here that the dashboard has off renders a button that fails with "not allowed".
    appearance: {
      // Hex = the modal's background colour; mirrors --card in globals.css.
      theme: theme === "dark" ? "#0E0C16" : "#FFFFFF",
      accentColor: theme === "dark" ? "#FF2BD6" : "#C2109F",
      logo: "/icon.svg",
      landingHeader: "Sign in to Stamp",
      loginMessage: "Your attention has a price. Set it.",
      walletChainType: "ethereum-only",
      walletList: ["detected_ethereum_wallets", "metamask", "coinbase_wallet", "okx_wallet", "rainbow", "wallet_connect"],
    },
    embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" }, showWalletUIs: true },
    // Our own WalletConnect project (with this domain verified in the Reown dashboard) lets mobile wallets show the
    // site as verified instead of "unknown domain". Without one, Privy falls back to its shared project.
    walletConnectCloudProjectId: WALLETCONNECT_PROJECT_ID || undefined,
    legal: { privacyPolicyUrl: `${SITE_URL}/privacy` },
    defaultChain: defaultChainId === arcMainnet.id ? arcMainnet : arcTestnet,
    supportedChains: [arcTestnet, arcMainnet],
  };
}

function linkedOf(user: User | null): AuthApi["linked"] {
  if (!user) return [];
  const out: AuthApi["linked"] = [];
  if (user.twitter) out.push({ type: "twitter", label: `@${user.twitter.username}` });
  if (user.discord) out.push({ type: "discord", label: user.discord.username ?? "Discord" });
  if (user.google) out.push({ type: "google", label: user.google.email });
  if (user.email) out.push({ type: "email", label: user.email.address });
  if (user.linkedAccounts.some((a) => a.type === "passkey")) out.push({ type: "passkey", label: "Passkey" });
  for (const a of user.linkedAccounts) {
    if (a.type === "wallet" && a.chainType === "ethereum") out.push({ type: "wallet", label: a.walletClientType === "privy" ? `Stamp wallet ${a.address}` : a.address });
  }
  return out;
}

function Bridge({ children }: { children: ReactNode }) {
  const shell = useAuthShell();
  const { ready, authenticated, user, logout: privyLogout, getAccessToken, unlinkTwitter, unlinkDiscord, unlinkGoogle, unlinkEmail } = usePrivy();
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { exportWallet } = useExportWallet();
  const { data: features } = useFeatures();
  const qc = useQueryClient();
  const synced = useRef<string | null>(null);

  const embedded = user?.linkedAccounts.find((a) => a.type === "wallet" && a.walletClientType === "privy");
  const embeddedAddress = embedded && "address" in embedded ? embedded.address : undefined;

  /** Exchange the Privy login for our HttpOnly session and cache the profile. */
  const syncSession = useCallback(async () => {
    if (!features?.accounts) return;
    const [token, idToken] = await Promise.all([getAccessToken(), getIdentityToken()]);
    if (!token || !idToken) return;
    const { profile } = await api<{ profile: PrivateProfile }>("/api/auth/session", { method: "POST", token, body: { idToken, address } });
    qc.setQueriesData({ queryKey: ["me"] }, profile);
    await qc.invalidateQueries({ queryKey: ["me"] });
  }, [features?.accounts, getAccessToken, address, qc]);

  // Once per signed-in user, as soon as they have a wallet (embedded wallets are created right after first login).
  useEffect(() => {
    if (!ready || !authenticated || !user || !user.wallet || !features?.accounts) return;
    if (synced.current === user.id) return;
    synced.current = user.id;
    syncSession().catch((err) => {
      synced.current = null;
      toast.error("Couldn't finish signing in", { description: (err as Error).message });
    });
  }, [ready, authenticated, user, features?.accounts, syncSession]);

  // Safety net: an email/social user who ends up without a wallet (auto-create off in the Privy dashboard, or it
  // failed) could never open an inbox or finish signing in. Give auto-create a moment, then create one ourselves.
  const { createWallet } = useCreateWallet();
  const walletAttempted = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !authenticated || !user || user.wallet || walletAttempted.current === user.id) return;
    const t = setTimeout(() => {
      walletAttempted.current = user.id;
      createWallet().catch((err) => toast.error("Couldn't create your wallet", { description: (err as Error).message }));
    }, 4000);
    return () => clearTimeout(t);
  }, [ready, authenticated, user, createWallet]);

  useEffect(() => {
    if (ready) rememberSignedIn(authenticated);
  }, [ready, authenticated]);

  // Privy never becomes ready with a wrong app id or when auth.privy.io is unreachable. Don't spin forever.
  const { fail } = shell;
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => fail("Privy didn't become ready in 15s (check NEXT_PUBLIC_PRIVY_APP_ID and allowed origins)."), 15_000);
    return () => clearTimeout(t);
  }, [ready, fail]);

  const { login } = useLogin({ onError: (e) => e !== "exited_auth_flow" && toast.error("Sign-in failed", { description: String(e) }) });
  const links = useLinkAccount({
    onSuccess: () => {
      syncSession().catch(() => {});
      toast.success("Account linked ✓");
    },
    onError: (e) => e !== "exited_link_flow" && toast.error("Couldn't link that account", { description: String(e) }),
  });

  // A "Sign in" click that happened before this chunk loaded.
  const { pendingLogin, clearPendingLogin } = shell;
  useEffect(() => {
    if (ready && pendingLogin) {
      clearPendingLogin();
      if (!authenticated) login();
    }
  }, [ready, pendingLogin, clearPendingLogin, authenticated, login]);

  const logout = useCallback(async () => {
    await api("/api/auth/session", { method: "DELETE" }).catch(() => {});
    await privyLogout();
    synced.current = null;
    rememberSignedIn(false);
    qc.removeQueries({ queryKey: ["me"] });
  }, [privyLogout, qc]);

  // Privy's hooks return fresh objects on every render (useLinkAccount, user…). Publishing a new API object each
  // time would re-render the whole tree through the shell context and loop forever (React error #185), so the
  // published object depends only on plain values; actions read the latest hook results through a ref.
  const live = useRef({ login, logout, getAccessToken, syncSession, links, user, unlinkTwitter, unlinkDiscord, unlinkGoogle, unlinkEmail, exportWallet, switchChainAsync });
  useLayoutEffect(() => {
    live.current = { login, logout, getAccessToken, syncSession, links, user, unlinkTwitter, unlinkDiscord, unlinkGoogle, unlinkEmail, exportWallet, switchChainAsync };
  });
  const linkedKey = JSON.stringify(linkedOf(user));

  const value = useMemo<AuthApi>(
    () => ({
      mode: "privy",
      ready,
      authenticated,
      address,
      chainId,
      embedded: Boolean(address && embeddedAddress && address.toLowerCase() === embeddedAddress.toLowerCase()),
      login: () => live.current.login(),
      logout: () => live.current.logout(),
      getAccessToken: () => live.current.getAccessToken(),
      refreshSession: () => live.current.syncSession(),
      link: (a) => {
        const l = live.current.links;
        ({
          twitter: l.linkTwitter,
          discord: l.linkDiscord,
          google: l.linkGoogle,
          email: l.linkEmail,
          passkey: () => l.linkPasskey(),
          wallet: () => l.linkWallet(),
        })[a]();
      },
      unlink: async (a) => {
        const { user: u, unlinkTwitter: ut, unlinkDiscord: ud, unlinkGoogle: ug, unlinkEmail: ue, syncSession: sync } = live.current;
        if (a === "twitter" && u?.twitter) await ut(u.twitter.subject);
        else if (a === "discord" && u?.discord) await ud(u.discord.subject);
        else if (a === "google" && u?.google) await ug(u.google.subject);
        else if (a === "email" && u?.email) await ue(u.email.address);
        await sync().catch(() => {});
      },
      linked: JSON.parse(linkedKey) as AuthApi["linked"],
      exportWallet: embeddedAddress ? () => live.current.exportWallet({ address: embeddedAddress }) : undefined,
      switchChain: async (id) => {
        await live.current.switchChainAsync({ chainId: id as typeof arcTestnet.id });
      },
    }),
    [ready, authenticated, address, chainId, embeddedAddress, linkedKey],
  );

  const { setApi } = shell;
  useEffect(() => {
    setApi(value);
  }, [setApi, value]);
  useEffect(() => () => setApi(null), [setApi]);

  return children;
}

export default function PrivyRuntime({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const { chain } = useNetwork();
  const config = useMemo(() => privyConfig(theme, chain.id), [theme, chain.id]);
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={config}>
      <WagmiProvider config={wagmiConfig}>
        <Bridge>{children}</Bridge>
      </WagmiProvider>
    </PrivyProvider>
  );
}

