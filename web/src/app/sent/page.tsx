import type { Metadata } from "next";
import { ConnectGate } from "@/components/connect-gate";
import { SentDashboard } from "@/components/sent/sent-dashboard";

export const metadata: Metadata = { title: "Sent" };

export default function Page() {
  return (
    <ConnectGate title="Your sent stamps" description="Connect your wallet to see the stamps you've sent, their status, and reclaim any that went unanswered.">
      <SentDashboard />
    </ConnectGate>
  );
}
