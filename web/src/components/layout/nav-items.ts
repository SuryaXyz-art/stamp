import { Home, Inbox, Send, Stamp } from "lucide-react";

/** Primary destinations, shared by the desktop header and the phone bottom nav. */
export const navItems = [
  { href: "/", label: "Home", icon: Home, mobileOnly: true },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/sent", label: "Sent", icon: Send },
  { href: "/setup", label: "Open inbox", icon: Stamp },
] as const;
