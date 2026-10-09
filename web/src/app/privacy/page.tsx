import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { REPO_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Stamp collects (nothing), what is public on-chain (a lot), and what stays in your browser.",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-bold uppercase sm:text-3xl">{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: [string, string]; rows: [ReactNode, ReactNode][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">
              {head[0]}
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              {head[1]}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(([a, b], i) => (
            <tr key={i} className="align-top">
              <td className="px-4 py-2.5">{a}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const code = (s: string) => <code className="rounded bg-muted px-1.5 py-0.5 text-[13px]">{s}</code>;

/** Mirrors PRIVACY.md at the repo root. Keep them in sync. */
export default function Page() {
  return (
    <article className="mx-auto max-w-3xl space-y-12 px-4 py-10 sm:py-16">
      <header className="space-y-4">
        <p className="text-sm text-muted-foreground">Last updated 5 October 2026</p>
        <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">Privacy</h1>
        <p className="text-lg text-pretty">
          Stamp has no accounts, no database, no cookies, no analytics and no trackers. But everything you do on Stamp is written to a
          public blockchain, including the text of your messages.
        </p>
        <p className="flex gap-2.5 rounded-xl border border-amber/40 bg-amber/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-ink" aria-hidden="true" />
          <span>
            Treat every message and reply as if you were posting it publicly under your wallet address. It can never be deleted,
            not even by us.
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
          Encrypted messages are planned. Even then, sender, receiver, amount, timestamps and status stay public, and messages already
          sent stay readable.
        </p>
      </Section>

      <Section title="What we collect">
        <p>Nothing on our own servers. There&apos;s no backend database, no user accounts and no cookies.</p>
        <Table
          head={["Who", "What they can see"]}
          rows={[
            ["Our host (Vercel)", "Standard request logs: IP address, user agent, requested URL"],
            ["The Arc RPC your browser talks to", "Your IP, the addresses and inboxes you look up, transactions you submit"],
            ["Your wallet, and WalletConnect if you use it", "Whatever their own privacy policies say"],
          ]}
        />
      </Section>

      <Section title="Stored in your browser">
        <p>These stay on your device and are never sent to us. Clear this site&apos;s data to remove them.</p>
        <Table
          head={["Key", "Purpose"]}
          rows={[
            [code("stamp:theme"), "Light or dark mode"],
            [code("stamp:network"), "Mainnet or testnet"],
            [code("stamp:tour-done"), "Whether you dismissed the intro tour"],
            [<>{code("wagmi.*")} {code("rk-*")}</>, "Which wallet you last connected (set by the wallet libraries)"],
          ]}
        />
      </Section>

      <Section title="Your choices">
        <ul className="list-disc space-y-2 pl-5">
          <li>Don&apos;t put anything private in a message. Only add reply-to details you&apos;re happy to publish.</li>
          <li>Close your inbox any time from Inbox → Settings. Existing history stays on-chain.</li>
          <li>Use a dedicated wallet for Stamp if you don&apos;t want it linked to your other on-chain activity.</li>
        </ul>
      </Section>

      <Section title="Deletion, changes and contact">
        <p>
          We hold no personal data, so there&apos;s nothing for us to delete. On-chain data can&apos;t be deleted by anyone. If accounts,
          notifications or encryption ship, this page will be updated first and will list exactly what is stored, where, and for how
          long.
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
