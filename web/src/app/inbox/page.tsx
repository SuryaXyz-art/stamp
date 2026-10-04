import type { Metadata } from "next";
import { ConnectGate } from "@/components/connect-gate";
import { InboxDashboard } from "@/components/inbox/inbox-dashboard";

export const metadata: Metadata = { title: "Inbox" };

export default function Page() {
  return (
    <ConnectGate title="Your inbox" description="Connect the wallet you opened your inbox with to read and settle your stamped messages.">
      <InboxDashboard />
    </ConnectGate>
  );
}
