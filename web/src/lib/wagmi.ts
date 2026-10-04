import { connectorsForWallets, type WalletList } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { arcMainnet, arcTestnet } from "./chains";
import { getNetworkConfig, WALLETCONNECT_PROJECT_ID } from "./config";

/**
 * Browser-extension wallets work with no configuration at all. WalletConnect-based wallets
 * (mobile QR, MetaMask Mobile, Rainbow) are added only when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set.
 */
const wallets: WalletList = WALLETCONNECT_PROJECT_ID
  ? [
      { groupName: "Popular", wallets: [metaMaskWallet, rabbyWallet, coinbaseWallet, rainbowWallet, walletConnectWallet] },
      { groupName: "Other", wallets: [injectedWallet] },
    ]
  : [{ groupName: "Browser wallets", wallets: [injectedWallet, rabbyWallet, coinbaseWallet] }];

const connectors = connectorsForWallets(wallets, {
  appName: "Stamp",
  projectId: WALLETCONNECT_PROJECT_ID || "stamp-no-walletconnect",
});

export const wagmiConfig = createConfig({
  chains: [arcMainnet, arcTestnet],
  connectors,
  ssr: true,
  transports: {
    [arcMainnet.id]: http(getNetworkConfig("mainnet").rpcUrl, { batch: true }),
    [arcTestnet.id]: http(getNetworkConfig("testnet").rpcUrl, { batch: true }),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
