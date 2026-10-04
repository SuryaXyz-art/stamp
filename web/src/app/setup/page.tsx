import type { Metadata } from "next";
import { SetupWizard } from "@/components/setup/setup-wizard";

export const metadata: Metadata = { title: "Open your inbox" };

export default function Page() {
  return <SetupWizard />;
}
