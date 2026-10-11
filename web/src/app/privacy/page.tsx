import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { REPO_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Stamp stores (a small profile, never your email), what is public on-chain (a lot), and what stays in your browser.",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-bold uppercase sm:text-3xl">{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label={head.join(", ")}>
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((cells, i) => (
            <tr key={i} className="align-top">
              {cells.map((c, j) => (
                <td key={j} className={j === 0 ? "px-4 py-2.5" : "px-4 py-2.5 text-muted-foreground"}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const code = (s: string) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">{s}</code>;

/** Mirrors PRIVACY.md at the repo root. Keep them in sync. */
export default function Page() {
  return (
    <article className="mx-auto max-w-3xl space-y-12 px-4 py-10 sm:py-16">
      <header className="space-y-4">
        <p className="kicker">Last updated 10 October 2026</p>
        <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">Privacy</h1>
        <p className="text-lg text-pretty">
          Accounts are optional. If you sign in we keep a small profile: handle, display name, wallet address and the public usernames of
          accounts you link. <strong>We never store your email, phone number, OAuth tokens or private keys.</strong> No analytics, no
          trackers.
        </p>
        <p className="flex gap-2.5 rounded-xl border border-amber/40 bg-amber/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-ink" aria-hidden="true" />
          <span>
            Messages are still written to a public blockchain. Treat every message and reply as if you were posting it publicly under your
            wallet address. It can never be deleted, not even by us.
          </span>
        </p>
      </header>

      <Section title="Public on Arc, forever">
        <Table
          head={["Data", "Where it lives"]}
          rows={[
            ["Your wallet address", "Every stamp you send or receive"],
            [<strong key="m">Message text, including any contact details you type</strong>, <>{code("Sent")} event and transaction input</>],
            [<strong key="r">Reply text</strong>, <>{code("Settled")} event and transaction input</>],
            ["Who messaged whom, amount, time, and whether it was replied to, kept or reclaimed", "Contract storage and events"],
            ["Your inbox price and headline", "Contract storage"],
          ]}
        />
        <p className="text-sm text-muted-foreground">
          End-to-end encrypted messages are in development. Even then, sender, receiver, amount, timestamps and status stay public, and
          messages already sent stay readable.
        </p>
      </Section>

      <Section title="What we store if you sign in">
        <Table
          head={["Data", "Why", "Public?"]}
          rows={[
            ["Your Privy user ID", "Links your profile to your sign-in", "No"],
            ["Receiving wallet address", "Where stamps are paid", "Yes (on-chain anyway)"],
            ["Handle + the signature binding it to your wallet", <>Your {code("/@handle")} link, verifiable by anyone</>, "Yes"],
            ["Display name, avatar choice", "Your public profile", "Yes"],
            ["X / Discord / GitHub usernames", "Verified badges", "Only if shown (Settings → Privacy)"],
            ["Whether Google, email or a passkey is linked (yes/no)", "Settings page", "No"],
            ["Price and headline picked in onboarding", "Pre-filling onboarding", "No"],
          ]}
        />
        <p className="text-sm text-muted-foreground">
          Kept until you delete your account. Export or delete it any time from{" "}
          <Link href="/settings" className="underline underline-offset-4">
            Settings → Your data
          </Link>
          .
        </p>
      </Section>

      <Section title="Who else processes data">
        <Table
          head={["Who", "What they can see"]}
          rows={[
            [
              <a key="p" href="https://www.privy.io/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                Privy
              </a>,
              "Your email, social account, passkey and embedded-wallet key shares (sign-in and self-custodial wallets). Your wallet key never reaches Stamp.",
            ],
            ["X, Discord or Google", "That you used it to sign in to Stamp"],
            ["Vercel (hosting)", "Standard request logs: IP address, user agent, requested URL"],
            ["Neon (database)", "The profile data above"],
            ["Upstash (rate limits, if enabled)", "Your IP or user ID, briefly, as a counter"],
            ["The Arc RPC your browser talks to", "Your IP, the addresses and inboxes you look up, transactions you submit"],
            ["Your external wallet, WalletConnect", "Whatever their own policies say"],
          ]}
        />
        <p className="text-sm text-muted-foreground">X profile pictures are fetched by our server and served from our domain, so your browser never contacts X for them.</p>
      </Section>

      <Section title="Cookies and browser storage">
        <Table
          head={["Name", "Purpose"]}
          rows={[
            [code("stamp_session"), "HttpOnly cookie (7 days): keeps you signed in to Stamp's API. Contains only your Privy user ID and a CSRF token."],
            [code("stamp_csrf"), "Cookie (7 days): protects your account from cross-site requests"],
            [code("privy:*"), "Privy's own sign-in session"],
            [code("stamp:signed-in"), "Remembers to load sign-in on your next visit"],
            [<>{code("stamp:theme")} {code("stamp:network")} {code("stamp:tour-done")}</>, "Light/dark mode, mainnet/testnet, dismissed tour"],
            [code("wagmi.*"), "Which wallet you last connected"],
          ]}
        />
        <p className="text-sm text-muted-foreground">All strictly necessary or a choice you made; none track you. Signing out clears the cookies.</p>
      </Section>

      <Section title="Your choices">
        <ul className="list-disc space-y-2 pl-5">
          <li>Don&apos;t put anything private in a message. Only add reply-to details you&apos;re happy to publish.</li>
          <li>Hide your verified badges in Settings → Privacy.</li>
          <li>Close your inbox any time from Inbox → Settings. Existing history stays on-chain.</li>
          <li>Use a dedicated wallet for Stamp if you don&apos;t want it linked to your other on-chain activity.</li>
        </ul>
      </Section>

      <Section title="Deletion, changes and contact">
        <p>
          Settings → Your data → Delete account removes everything we store and deletes your Privy user. On-chain data can&apos;t be deleted by
          anyone, so move any USDC out of your Stamp wallet (or export its key) first. This page is updated before any feature that changes
          what we collect goes live.
        </p>
        <p>
          Questions:{" "}
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener" className="underline underline-offset-4">
            open an issue
          </a>
          . Security reports:{" "}
          <a href={`${REPO_URL}/security`} target="_blank" rel="noopener" className="underline underline-offset-4">
            report privately
          </a>
          .{" "}
          <Link href="/" className="underline underline-offset-4">
            Back home
          </Link>
        </p>
      </Section>
    </article>
  );
}
