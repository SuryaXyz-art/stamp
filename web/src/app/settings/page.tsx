import type { Metadata } from "next";
import { ConnectGate } from "@/components/connect-gate";
import { SettingsPage } from "@/components/settings/settings-page";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <ConnectGate title="Settings" description="Sign in to manage your profile, handle, linked accounts and wallet.">
      <SettingsPage />
    </ConnectGate>
  );
}
