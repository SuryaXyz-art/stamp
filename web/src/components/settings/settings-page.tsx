"use client";

import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Download, KeyRound, Link2, LogOut, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FundPanel } from "@/components/account/fund-panel";
import { HandleForm } from "@/components/account/handle-form";
import { Avatar } from "@/components/stamp/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, type LinkableAccount } from "@/components/wallet/auth-context";
import { useFeatures, useMe, useUpdateMe } from "@/hooks/use-profile";
import { api, type PrivateProfile } from "@/lib/api-client";
import { cn } from "@/lib/utils";

function Section({ id, title, description, children, tone }: { id: string; title: string; description?: ReactNode; children: ReactNode; tone?: "danger" }) {
  return (
    <section aria-labelledby={id} className={cn("panel p-5 sm:p-7", tone === "danger" && "[--edge:linear-gradient(135deg,var(--magenta),transparent)]")}>
      <h2 id={id} className="font-display text-xl font-bold uppercase">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ProfileSection({ me }: { me: PrivateProfile }) {
  const update = useUpdateMe();
  const nameId = useId();
  const [name, setName] = useState(me.displayName ?? "");
  const hasTwitterAvatar = me.accounts.some((a) => a.type === "twitter" && "avatarUrl" in a && a.avatarUrl);
  const sources: { value: PrivateProfile["avatarSource"]; label: string; enabled: boolean }[] = [
    { value: "twitter", label: "X picture", enabled: hasTwitterAvatar },
    { value: "identicon", label: "Identicon", enabled: true },
  ];

  return (
    <Section id="s-profile" title="Profile" description="Shown on your public page.">
      <div className="space-y-7">
        <div className="flex items-center gap-4">
          <Avatar address={me.address} src={me.avatarUrl} size={64} />
          <div role="radiogroup" aria-label="Profile picture" className="flex flex-wrap gap-2">
            {sources.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={me.avatarSource === s.value}
                disabled={!s.enabled || update.isPending}
                title={s.enabled ? undefined : "Link your X account first"}
                onClick={() => update.mutate({ avatarSource: s.value }, { onError: (e) => toast.error(e.message) })}
                className={cn(
                  "h-9 rounded-md border px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  me.avatarSource === s.value ? "border-magenta bg-magenta/15" : "border-border hover:border-cyan/60",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate(
              { displayName: name.trim() || null },
              { onSuccess: () => toast.success("Name saved ✓"), onError: (err) => toast.error("Couldn't save", { description: err.message }) },
            );
          }}
        >
          <label htmlFor={nameId} className="kicker block">
            Display name
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id={nameId} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Ada Lovelace" className="h-11 flex-1 rounded-lg" />
            <Button type="submit" variant="outline" className="h-11 rounded-lg" disabled={update.isPending || name.trim() === (me.displayName ?? "")}>
              Save
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <HandleForm current={me.handle} submitLabel={me.handle ? "Change" : "Claim"} />
          {me.handle && (
            <p className="text-sm text-muted-foreground">
              Public page:{" "}
              <Link href={`/@${me.handle}`} className="font-mono text-cyan-ink underline underline-offset-4">
                /@{me.handle}
              </Link>
              . Changing your handle breaks links to the old one.
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}

const ACCOUNT_ROWS: { type: LinkableAccount; name: string }[] = [
  { type: "twitter", name: "X" },
  { type: "discord", name: "Discord" },
  { type: "google", name: "Google" },
  { type: "email", name: "Email" },
  { type: "passkey", name: "Passkey" },
];

function AccountsSection() {
  const auth = useAuth();
  const [busy, setBusy] = useState<LinkableAccount | null>(null);
  const linkedCount = auth.linked.length;
  return (
    <Section id="s-accounts" title="Linked accounts" description="Sign in with any of them. X and Discord show a verified badge on your profile (you can hide it below).">
      <ul className="divide-y divide-border">
        {ACCOUNT_ROWS.map(({ type, name }) => {
          const linked = auth.linked.find((l) => l.type === type);
          return (
            <li key={type} className="flex items-center gap-3 py-3">
              <span className="w-20 font-display font-semibold tracking-wide uppercase">{name}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-muted-foreground">
                {linked ? (
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <BadgeCheck className="size-4 text-cyan-ink" aria-label="Verified" />
                    {linked.label}
                  </span>
                ) : (
                  "Not linked"
                )}
              </span>
              {linked ? (
                type !== "passkey" &&
                auth.unlink && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy !== null || linkedCount <= 1}
                    title={linkedCount <= 1 ? "Keep at least one way to sign in" : undefined}
                    onClick={async () => {
                      setBusy(type);
                      try {
                        await auth.unlink!(type);
                        toast.success(`${name} unlinked`);
                      } catch (err) {
                        toast.error(`Couldn't unlink ${name}`, { description: (err as Error).message });
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    Unlink
                  </Button>
                )
              ) : (
                <Button variant="outline" size="sm" className="rounded-md" onClick={() => auth.link(type)}>
                  <Link2 aria-hidden="true" /> Link
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function PrivacySection({ me }: { me: PrivateProfile }) {
  const update = useUpdateMe();
  const rows: { key: keyof PrivateProfile["privacy"]; label: string; has: boolean }[] = [
    { key: "showTwitter", label: "Show my verified X account on my profile", has: me.accounts.some((a) => a.type === "twitter") },
    { key: "showDiscord", label: "Show my verified Discord account on my profile", has: me.accounts.some((a) => a.type === "discord") },
  ];
  return (
    <Section
      id="s-privacy"
      title="Privacy"
      description={
        <>
          Messages are public on-chain until encryption ships. We never store your email.{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            Read the policy
          </Link>
          .
        </>
      }
    >
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.key}>
            <label className={cn("flex items-center gap-3 text-sm", !r.has && "opacity-60")}>
              <Checkbox
                checked={me.privacy[r.key]}
                disabled={!r.has || update.isPending}
                onCheckedChange={(v) => update.mutate({ privacy: { [r.key]: Boolean(v) } }, { onError: (e) => toast.error(e.message) })}
              />
              {r.label}
              {!r.has && <span className="text-xs text-muted-foreground">(not linked)</span>}
            </label>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function DataSection() {
  const auth = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const confirmId = useId();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function download() {
    try {
      const token = await auth.getAccessToken();
      const res = await fetch("/api/me/export", { headers: { authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: `stamp-export-${new Date().toISOString().slice(0, 10)}.json` });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Couldn't export", { description: (err as Error).message });
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const token = await auth.getAccessToken();
      await api("/api/me", { method: "DELETE", token, body: { confirm } });
      qc.removeQueries({ queryKey: ["me"] });
      await auth.logout();
      toast.success("Account deleted", { description: "Your profile and handle are gone. On-chain history stays on Arc." });
      router.push("/");
    } catch (err) {
      toast.error("Couldn't delete", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section id="s-data" title="Your data" tone="danger" description="Download everything we store, or delete your account. On-chain stamps can't be deleted by anyone.">
      <div className="space-y-6">
        <Button variant="outline" className="h-11 rounded-lg" onClick={download}>
          <Download aria-hidden="true" /> Export my data (JSON)
        </Button>
        <div className="space-y-2">
          <label htmlFor={confirmId} className="text-sm">
            Type <span className="font-mono font-semibold">DELETE</span> to delete your Stamp account
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id={confirmId} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="h-11 flex-1 rounded-lg font-mono" />
            <Button variant="destructive" className="h-11 rounded-lg" disabled={confirm !== "DELETE" || busy} onClick={remove}>
              <Trash2 aria-hidden="true" /> {busy ? "Deleting…" : "Delete account"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Withdraw or move any USDC first: deleting your account also removes your Stamp wallet login.</p>
        </div>
      </div>
    </Section>
  );
}

export function SettingsPage() {
  const auth = useAuth();
  const { data: features } = useFeatures();
  const { data: me, isLoading } = useMe();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Account</p>
          <h1 className="mt-1 font-display text-4xl font-bold uppercase sm:text-5xl">Settings</h1>
        </div>
        <Button variant="outline" className="rounded-lg" onClick={() => auth.logout()}>
          <LogOut aria-hidden="true" /> Sign out
        </Button>
      </div>

      {!features?.accounts && (
        <p className="rounded-lg border border-amber/40 bg-amber/10 p-4 text-sm">
          Profiles, handles and linked accounts aren&apos;t configured on this server yet. Your wallet works as usual.
        </p>
      )}

      {features?.accounts && (isLoading ? <Skeleton className="h-72 rounded-xl" /> : me && <ProfileSection me={me} />)}
      {auth.mode === "privy" && <AccountsSection />}

      {auth.address && (
        <Section
          id="s-wallet"
          title="Wallet"
          description={
            <>
              Stamps are paid to and from this wallet. Inbox price and headline live on-chain:{" "}
              <Link href="/inbox" className="underline underline-offset-4">
                Inbox → Settings
              </Link>
              .
            </>
          }
        >
          <FundPanel address={auth.address} />
          {auth.exportWallet && (
            <div className="mt-6 rounded-lg border border-border p-4">
              <p className="flex items-center gap-2 font-medium">
                <KeyRound className="size-4 text-amber-ink" aria-hidden="true" /> Export private key
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your Stamp wallet is self-custodial. Export the key to use it in MetaMask or Rabby. Anyone with this key controls the funds.
              </p>
              <Button variant="outline" className="mt-3 rounded-lg" onClick={() => auth.exportWallet!().catch((e) => toast.error(e.message))}>
                Export key
              </Button>
            </div>
          )}
        </Section>
      )}

      {features?.accounts && me && <PrivacySection me={me} />}
      {features?.accounts && me && <DataSection />}
    </div>
  );
}
