# Arc Microgrants: launch checklist and submission kit

Program: [Arc Microgrants on DoraHacks](https://dorahacks.io/hackathon/arc-microgrants). 20 grants of 500 USDC from a 10,000 USDC pool. **Submissions close 14 October 2026, 23:59 ET**, and are reviewed as they arrive, so earlier is better.

Eligibility: **deployed and working on Arc mainnet**, a **live link** and a **public repo**. Testnet-only projects are not eligible.
Reviewers weigh: relevance to Arc, technical credibility, build quality, and whether the project is worth supporting further.

## 1. Deploy StampBox to Arc mainnet (about 5 minutes, a few cents of USDC)

You need a deployer wallet with a little native USDC on Arc mainnet (gas is paid in USDC; the deploy costs well under $0.10).

```powershell
cast wallet import stamp-deployer --interactive    # once; encrypted keystore, never a raw key in a file
cd contracts
forge test                                          # 70/70 should pass
forge script script/Deploy.s.sol --rpc-url arc_mainnet --account stamp-deployer --broadcast
pnpm record mainnet                                 # writes deployments/arc-mainnet.json + regenerates web/src/generated
```

Optional, and worth it for credibility: verify the source on the explorer.

```powershell
forge verify-contract <ADDRESS> src/StampBox.sol:StampBox --chain-id 5042 --verifier blockscout --verifier-url https://explorer.arc.io/api/
```

Once `deployments/arc-mainnet.json` exists, the app opens on mainnet by default, and the footer toggle still offers testnet.

## 2. Put real activity on mainnet

Reviewers click around. An empty contract reads like a demo, while a few real settled stamps read like a product.

1. Open your own inbox on mainnet at a low price (for example $0.10 via "Custom") with a headline like "Builder of Stamp. I refund every genuine message."
2. From a second wallet, send it 2 or 3 stamps. Refund one with a reply, keep one as spam, and leave one pending. Every state then has a real receipt.
3. Use that inbox as the demo inbox: set `NEXT_PUBLIC_DEMO_INBOX=<your address>` in Vercel (step 4).

## 3. Publish the repo

Create an empty public repo at github.com/new (for example `stamp`), then:

```powershell
git remote add origin https://github.com/<you>/stamp.git
git push -u origin main
```

Merge `feat/v2-enhancements` into `main` first, or push the branch and make it the default.

## 4. Deploy the web app on Vercel

Import the repo at vercel.com/new and set **Root Directory = `web`**. Environment variables:

| Variable | Value | Needed? |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://<your-project>.vercel.app` | Yes (share links, OG cards, badge URLs) |
| `NEXT_PUBLIC_REPO_URL` | `https://github.com/<you>/stamp` | Yes (footer, developers page) |
| `NEXT_PUBLIC_DEMO_INBOX` | your mainnet inbox address | Strongly recommended |
| `NEXT_PUBLIC_ARC_MAINNET_RPC` | a provider endpoint (Alchemy, QuickNode, dRPC) | Recommended: the public RPC rate-limits log scans |
| `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_VERIFICATION_KEY`, `PRIVY_APP_SECRET` | from dashboard.privy.io | For social sign-in, handles and settings. Add your Vercel domain to Privy's allowed origins. |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"` | With Privy |
| `DATABASE_URL` | Neon connection string, then run `pnpm --filter web db:migrate` once | With Privy |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash | Recommended in production (rate limits) |

Without the Privy, database and Upstash keys, the app still works fully as a wallet app; account features hide themselves.

Then replace the placeholders in `README.md`: the live app link, the mainnet explorer link for the contract and the demo video link.

## 5. Smoke-test the live site (2 minutes)

- [ ] Landing shows **Live from the StampBox contract on Arc** with your contract link and real numbers.
- [ ] `/<your address>` loads your inbox; sending from another wallet lands in `/inbox` within seconds.
- [ ] A refunded stamp's `/stamp/<id>` receipt links to both transactions on explorer.arc.io.
- [ ] `/api/v1/stamp?to=<your address>&message=hi` returns JSON with `tx`.
- [ ] `/badge/<your address>` shows your price.
- [ ] Paste your inbox link into X or Discord: the OG card renders.

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

**Circle and Arc stack used:** Arc mainnet (native USDC for gas and value), Circle's USDC faucet for testnet onboarding, Arc's 18-decimal native USDC (deliberately not the 6-decimal ERC-20 view), and the Arc explorer for receipts.

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
