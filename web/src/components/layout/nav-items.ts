import { Home, Inbox, Send, Stamp, UserRound } from "lucide-react";

/** Primary destinations. Desktop has the account menu for settings; phones get a "Me" tab instead. */
export const navItems = [
  { href: "/", label: "Home", icon: Home, show: "mobile" },
  { href: "/inbox", label: "Inbox", icon: Inbox, show: "both" },
  { href: "/sent", label: "Sent", icon: Send, show: "both" },
  { href: "/onboarding", label: "Open inbox", icon: Stamp, show: "desktop" },
  { href: "/settings", label: "Me", icon: UserRound, show: "mobile" },
] as const;
