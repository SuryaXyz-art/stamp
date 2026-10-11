import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { DEFAULT_NETWORK, getNetworkConfig, REPO_URL, SITE_URL } from "@/lib/config";
import type { NetworkKey } from "@/lib/chains";

export const metadata: Metadata = {
  title: "Developers & agents",
  description: "Let AI agents and scripts reach humans with a refundable USDC stamp on Arc: a public quote API, ready-to-sign transactions and an embeddable badge.",
};

function Section({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="kicker">{kicker}</p>
        <h2 className="mt-1 font-display text-2xl font-bold uppercase sm:text-3xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Code({ label, children }: { label: string; children: string }) {
  return (
    <pre
      tabIndex={0}
      aria-label={label}
      className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground"
    >
      {children}
    </pre>
  );
}

const networks: NetworkKey[] = ["mainnet", "testnet"];

export default function Page() {
  const net = getNetworkConfig(DEFAULT_NETWORK);
  const quote = `curl "${SITE_URL}/api/v1/stamp?to=@alice&message=Hi%20Alice"`;
  const response = `{
  "network": "${net.key}",
  "chainId": ${net.chain.id},
  "contract": "${net.stampBox ?? "0x…"}",
  "recipient": { "address": "0x…", "handle": "alice", "url": "${SITE_URL}/@alice" },
  "inbox": { "open": true, "price": "1000000000000000000", "priceUsdc": "$1.00", "bio": "…" },
  "rules": { "maxMessageBytes": 1000, "refundOnReply": true, "senderCanReclaimAfterSeconds": 604800, "messagesArePublic": true },
  "tx": { "chainId": ${net.chain.id}, "to": "${net.stampBox ?? "0x…"}", "value": "1000000000000000000", "data": "0x…" }
}`;
  const agent = `import { createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const arc = defineChain({
  id: ${net.chain.id},
  name: "${net.chain.name}",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["${net.chain.rpcUrls.default.http[0]}"] } },
});
const wallet = createWalletClient({ chain: arc, transport: http(), account: privateKeyToAccount(process.env.AGENT_KEY) });

// 1. Ask Stamp what it costs and get a ready-to-sign transaction.
const q = await fetch("${SITE_URL}/api/v1/stamp?" + new URLSearchParams({
  to: "@alice",
  message: "Hi Alice, I'm an agent booking demos for Acme. Reply and your $1 comes straight back.",
})).then((r) => r.json());

// 2. Budget check, then pay. The stamp rides along as native USDC: no approve, no allowance.
if (BigInt(q.tx.value) > 2n * 10n ** 18n) throw new Error("Too expensive for this agent");
const hash = await wallet.sendTransaction({ to: q.tx.to, value: BigInt(q.tx.value), data: q.tx.data });
// Final in under a second on Arc. If Alice replies, the stamp is refunded to this wallet.`;
  const solidity = `function send(address to, string message) payable returns (uint256 id);
function priceOf(address inbox) view returns (uint256);   // 0 = closed
function getStamp(uint256 id) view returns (Stamp memory);
function reclaim(uint256 id);                             // sender, after 7 days unanswered
event Sent(uint256 indexed id, address indexed from, address indexed to, uint256 amount, string message);
event Settled(uint256 indexed id, address indexed by, uint8 status, string reply);`;

  return (
    <article className="mx-auto max-w-3xl space-y-14 px-4 py-10 sm:py-16">
      <header className="space-y-4">
        <p className="kicker">Developers & agents</p>
        <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">Agents pay to reach humans</h1>
        <p className="text-lg text-pretty">
          AI agents can write a million cold DMs for free. With Stamp they put down a small, refundable USDC deposit instead. A human who
          replies refunds it. Spam pays the human. One HTTP call to quote, one transaction to send, final in under a second on Arc.
        </p>
        <p className="text-sm text-muted-foreground">
          The API is read-only and unauthenticated. Stamp never signs or sends for you: your agent&apos;s own wallet does, straight to the
          immutable contract.
        </p>
      </header>

      <Section kicker="Step 1" title="Quote">
        <p className="text-muted-foreground">
          <code className="font-mono text-foreground">GET /api/v1/stamp</code> with <code className="font-mono text-foreground">to</code> (an
          address, <code className="font-mono text-foreground">handle</code> or <code className="font-mono text-foreground">@handle</code>),
          optional <code className="font-mono text-foreground">network</code> (<code className="font-mono">mainnet</code> |{" "}
          <code className="font-mono">testnet</code>) and optional <code className="font-mono text-foreground">message</code>. With a
          message you also get <code className="font-mono text-foreground">tx</code>, ready to sign. CORS is open.
        </p>
        <Code label="Quote request">{quote}</Code>
        <Code label="Quote response">{response}</Code>
        <p className="text-sm text-muted-foreground">
          Errors come back as <code className="font-mono">{`{ "error": "…" }`}</code> with 400 (bad input), 404 (unknown handle), 409
          (inbox closed) or 429 (rate limited).
        </p>
      </Section>

      <Section kicker="Step 2" title="Send from your agent">
        <p className="text-muted-foreground">Any EVM wallet works. Here&apos;s an agent with its own key, using viem:</p>
        <Code label="Agent example in TypeScript">{agent}</Code>
        <p className="text-sm text-muted-foreground">
          Messages are public on-chain. Never put secrets in them. Track the stamp on its receipt page at{" "}
          <code className="font-mono">/stamp/&lt;id&gt;</code> or read <code className="font-mono">getStamp(id)</code>.
        </p>
      </Section>

      <Section kicker="Or skip the API" title="Call the contract">
        <Code label="StampBox interface">{solidity}</Code>
        <div className="overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label="Deployments">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Network</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Chain id</th>
                <th scope="col" className="px-4 py-2.5 font-medium">StampBox</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {networks.map((k) => {
                const n = getNetworkConfig(k);
                return (
                  <tr key={k}>
                    <td className="px-4 py-2.5">{n.chain.name}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{n.chain.id}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">
                      {n.stampBox ? (
                        <a className="break-all text-cyan-ink underline-offset-4 hover:underline" href={`${n.chain.blockExplorers.default.url}/address/${n.stampBox}`} target="_blank" rel="noopener">
                          {n.stampBox}
                        </a>
                      ) : (
                        "not deployed yet"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          Full ABI:{" "}
          <a className="text-cyan-ink underline-offset-4 hover:underline" href={`${REPO_URL}/blob/main/contracts/abi/StampBox.json`} target="_blank" rel="noopener">
            contracts/abi/StampBox.json
          </a>
          . No owner, no proxy, no fees.
        </p>
      </Section>

      <Section kicker="For humans" title="The badge">
        <p className="text-muted-foreground">
          <code className="font-mono text-foreground">/badge/&lt;address or handle&gt;</code> returns an SVG with your live price. Add{" "}
          <code className="font-mono">?theme=light</code> for light backgrounds. Copy your snippet from the{" "}
          <Link href="/inbox" className="text-cyan-ink underline-offset-4 hover:underline">
            Share button in your inbox
          </Link>
          .
        </p>
        <Code label="Badge in Markdown">{`[![Message me on Stamp](${SITE_URL}/badge/alice)](${SITE_URL}/@alice)`}</Code>
      </Section>
    </article>
  );
}
