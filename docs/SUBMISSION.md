# Arc Microgrants: launch checklist and submission kit

Program: [Arc Microgrants on DoraHacks](https://dorahacks.io/hackathon/arc-microgrants). 20 grants of 500 USDC from a 10,000 USDC pool. **Submissions close 14 October 2026, 23:59 ET**, and are reviewed as they arrive, so earlier is better.

Eligibility: **deployed and working on Arc mainnet**, a **live link** and a **public repo**. Testnet-only projects are not eligible.
Reviewers weigh: relevance to Arc, technical credibility, build quality, and whether the project is worth supporting further.

## The short version: one file, a few commands

Everything reads one file: **`.env` in the repo root** (start from `.env.example`; it's gitignored). Paste keys there, then:

```powershell
pnpm launch check     # what's set, deployer balance, what's left; run it any time
pnpm launch deploy    # StampBox → Arc mainnet, recorded in the app, source verified on explorer.arc.io
pnpm launch publish   # creates the public GitHub repo and pushes main (needs GITHUB_TOKEN)
pnpm launch env       # writes web/.env.local and web/.env.vercel (paste the latter into Vercel)
pnpm launch db        # creates the tables in Neon (only if you use DATABASE_URL)
pnpm launch circle    # registers StampBox in Circle's Developer Console + event monitors + webhook
```

## 1. Deploy StampBox to Arc mainnet

Make a **fresh wallet** used only for deploying, put its private key in `DEPLOYER_PRIVATE_KEY`, and send it **at least $0.20 of USDC on Arc mainnet** (USDC is the gas token; the deploy measured ~$0.09). StampBox has no owner, so this wallet holds no power afterwards. Then run `pnpm launch deploy`. It refuses to run without enough balance, checks the RPC really is chain 5042, writes `contracts/deployments/arc-mainnet.json`, and the app opens on mainnet from then on. Commit that file and `web/src/generated/`.

Prefer an encrypted keystore instead of a key in `.env`? `forge script script/Deploy.s.sol --rpc-url arc_mainnet --account <name> --broadcast`, then `pnpm --filter @stamp/contracts record mainnet`.

## 2. Put real activity on mainnet

Reviewers click around. An empty contract reads like a demo, while a few real settled stamps read like a product.

1. Open your own inbox on mainnet at a low price (for example $0.10 via "Custom") with a headline like "Builder of Stamp. I refund every genuine message."
2. From a second wallet, send it 2 or 3 stamps. Refund one with a reply, keep one as spam, and leave one pending. Every state then has a real receipt.
3. Put that inbox address in `NEXT_PUBLIC_DEMO_INBOX`.

## 3. Publish the repo

With `GITHUB_TOKEN` set, `pnpm launch publish` creates `github.com/<you>/<GITHUB_REPO>` (public) and pushes your current branch as `main`. It refuses if you have uncommitted changes or if any secret from your `.env` files appears in the git history. The token is used for that one push and isn't saved in git config. Without a token: create an empty public repo on github.com, then `git remote add origin <url>` and `git push -u origin HEAD:main`.

## 4. Deploy the web app on Vercel

vercel.com/new → import the repo → **Root Directory: `web`** → Deploy. Put the resulting URL in `NEXT_PUBLIC_SITE_URL`, run `pnpm launch env`, paste **all of `web/.env.vercel`** into Project → Settings → Environment Variables (Vercel accepts a pasted .env), then redeploy. If you use Privy, add the Vercel domain to its allowed origins.

## 4b. Circle Developer Console

Create a **mainnet** API key at console.circle.com → Keys (it starts with `LIVE_API_KEY:`) and put it in `CIRCLE_API_KEY`. After the Vercel deploy (so the webhook URL exists and has the key), run `pnpm launch circle`. It:

- imports StampBox into **Circle Contracts** on `ARC`, so it appears under Contracts in the console with its ABI and events;
- creates **event monitors** for `Sent` and `Settled`;
- subscribes `https://<your site>/api/webhooks/circle` to `contracts.eventLog`. The app verifies Circle's ECDSA signature on every delivery and keeps public event data (no message text) for the **Latest on Arc** list on the landing page. Deliveries show under **Contracts → Monitoring** in the console.

With a testnet key (`TEST_API_KEY:`), `pnpm launch circle --testnet` does the same for the testnet deployment.

## 5. Smoke-test the live site (2 minutes)

- [ ] Landing shows **Live from the StampBox contract on Arc** with your contract link and real numbers.
- [ ] `/<your address>` loads your inbox; sending from another wallet lands in `/inbox` within seconds.
- [ ] A refunded stamp's `/stamp/<id>` receipt links to both transactions on explorer.arc.io.
- [ ] `/api/v1/stamp?to=<your address>&message=hi` returns JSON with `tx`.
- [ ] `/badge/<your address>` shows your price.
- [ ] Paste your inbox link into X or Discord: the OG card renders.
- [ ] Send one more stamp: within seconds it shows under **Latest on Arc** on the landing page and under Contracts → Monitoring in console.circle.com.

## 6. DoraHacks BUIDL form copy

**Name:** Stamp

**Tagline:** A refundable paid inbox on Arc: strangers attach a USDC stamp to reach you. Reply and they're refunded. Spam pays you.

**Description:**

> Cold DMs and AI-agent spam are exploding, and filters keep losing. Stamp prices attention instead. Anyone can message you by attaching a small USDC deposit (you pick the price, for example $1). Reply and the stamp is refunded in the same transaction, so genuine senders pay nothing. Mark it spam and you keep it. Ignore it for 7 days and the sender can reclaim it, so nobody's money is held hostage.
>
> Everything that matters lives in one immutable contract on Arc mainnet: escrow, settlement and message delivery. No owner, no admin keys, no fees, no proxy. It has 100% test coverage with fuzzing, invariant tests and malicious-receiver tests, and a sender who can't receive USDC never blocks settlement (deferred payouts with a pull withdraw).
>
> Stamp also works for machines: a public quote API returns a ready-to-sign transaction, so AI agents pay a refundable deposit to reach a human instead of spamming for free. A "Message me" badge with your live price spreads it through GitHub READMEs and email signatures.

**Why Arc (relevance):**

> A $1 refundable deposit only makes sense on Arc. USDC is the gas token, so a sender needs exactly one asset: dollars. Fees are a fraction of a cent, so a $0.25 stamp is economically sane, while on most chains the gas would cost more than the stamp. Sub-second deterministic finality means a stamp is delivered like a DM, with no confirmation spinners. And the stamp rides along as native USDC through `msg.value`: no approve, no allowance.

**Circle and Arc stack used:** Arc mainnet (native USDC for gas and value; deliberately the 18-decimal native balance, not the 6-decimal ERC-20 view), **Circle Contracts** (StampBox imported into the Developer Console, with event monitors on `Sent` and `Settled`), **Circle webhooks** (ECDSA-verified `contracts.eventLog` deliveries power the live activity feed), Circle's USDC faucet for testnet onboarding, and the Arc explorer for receipts.

**Tech:** Solidity 0.8.30 + Foundry (unit, fuzz, invariant and reentrancy tests; 100% coverage), Next.js 16, viem/wagmi, Privy (social, email and passkey sign-in with self-custodial embedded wallets), Drizzle + Postgres for optional profiles and handles, strict nonce-based CSP, CodeQL, gitleaks and Dependabot in CI.

**What's next (why fund it):** end-to-end encrypted messages (keys derived from a wallet signature, X25519 + XChaCha20), email, Telegram and push notifications for new stamps, cross-chain funding with Circle's Bridge Kit (CCTP), an agent SDK with an HTTP 402 flow, and an allowlist or free tier for friends.

**Links:** live app, `https://explorer.arc.io/address/<contract>`, GitHub repo, demo video.

## 7. Demo video (aim for 2 minutes)

1. **0:00 Hook (10 s).** Your inbox full of cold DMs. "What if strangers had to put a dollar down to reach you, and got it back when you replied?"
2. **0:10 Open an inbox (25 s).** Sign in with X, claim `@handle`, pick $1, open. Show the share panel, badge included.
3. **0:35 Send (25 s).** In a second browser, open `/@handle`, write a message, send. Point out "Delivered" in under a second, with one asset (USDC) and no approve.
4. **1:00 Triage (30 s).** In the inbox, reply to one (the stamp is refunded and the sender sees +$1), keep a spam one (+$1 to you). Keyboard shortcuts.
5. **1:30 Proof (15 s).** The receipt page, then the transaction on explorer.arc.io. "Immutable contract, no admin keys, 100% coverage."
6. **1:45 Agents (15 s).** `curl /api/v1/stamp?...` returns a ready-to-sign tx. "Agents pay to reach humans."
7. **2:00 Close.** "Stamp. Your attention has a price. Set it."
