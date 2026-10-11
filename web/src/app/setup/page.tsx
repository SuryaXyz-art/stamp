import { redirect } from "next/navigation";

/** Superseded by the three-step onboarding. */
export default function Page() {
  redirect("/onboarding");
}
