import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "Open your inbox" };

export default function Page() {
  return <OnboardingFlow />;
}
