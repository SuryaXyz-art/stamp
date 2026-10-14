# Stamp: the project handbook

> A refundable paid inbox on Arc. Strangers attach a small USDC stamp to message you. Reply and they get it back. Mark it as spam and you keep it. Ignore it for 7 days and they can take it back.

**Live app:** https://stamp-topaz.vercel.app · **Repo:** https://github.com/SuryaXyz-art/stamp · **Contract:** [`0x654Ac560d556300830CD7B4e0769aC33826556D4`](https://explorer.arc.io/address/0x654Ac560d556300830CD7B4e0769aC33826556D4) on Arc mainnet

This handbook is the long version of the README: every screen, every field, the contract, the API, how it's built and what comes next. It's plain Markdown, so you can import it into Notion as-is (**Notion → ⋯ → Import → Text & Markdown**).

---

## Contents

1. [The problem](#1-the-problem)
2. [The idea](#2-the-idea)
3. [Who it's for](#3-who-its-for)
4. [User journeys](#4-user-journeys)
5. [Every screen, field by field](#5-every-screen-field-by-field)
6. [The StampBox contract](#6-the-stampbox-contract)
7. [The public API](#7-the-public-api)
8. [Architecture](#8-architecture)
9. [Security and privacy](#9-security-and-privacy)
10. [Why Arc](#10-why-arc)
11. [Quality and testing](#11-quality-and-testing)
12. [Deployments and proof](#12-deployments-and-proof)
13. [Roadmap](#13-roadmap)
14. [Glossary](#14-glossary)

---

## 1. The problem

- Inboxes are flooded with cold pitches, and a growing share is written by AI agents that can send a million messages for free.
- Filters fight content, so they lose: a good bot writes a message that looks human.
- Paywalled DMs exist, but they punish genuine people. Someone with a real reason to reach you pays even when you're glad they did.

**The root cause is price, not content.** Sending a message costs nothing, so the cheapest strategy is to send to everyone.

## 2. The idea

Put a refundable price on attention.

| You (the receiver)… | …and the stamp |
|---|---|
| **Reply** | goes back to the sender in the same transaction. A genuine message costs nothing. |
| **Mark as spam** | is yours to keep. The spammer paid for your time. |
| **Ignore it for 7 days** | can be reclaimed by the sender. Nobody's money gets stuck. |

Everything that matters runs in one immutable smart contract on Arc: the escrow, the settlement and the message delivery itself. There's no owner, no admin keys, no fee and no proxy.

## 3. Who it's for

- **Founders, investors, creators and recruiters** who get more cold DMs than they can read.
- **People with public profiles** who want to be reachable without being spammed. The "Message me" badge sits in a GitHub README, website or email signature.
- **AI agents and outreach tools** that need a fair, machine-readable way to reach a human: put down a refundable deposit and let the human decide.
- **Senders with something genuine to say**, who get priority attention and pay nothing when the receiver replies.

## 4. User journeys

### Receiver: open an inbox

1. Click **Open my inbox** on the landing page.
2. **Sign in.** Use X, Discord, Google, email or a passkey (Privy creates a self-custodial wallet for you), or connect any browser wallet.
3. **Claim your name** (optional): pick a `/@handle`. You sign a free message to prove the wallet is yours.
4. **Set your price**: presets of $0.25, $1, $5 and $25, or a custom amount. Add an optional one-line headline, for example *"Founder @Acme · pitch me your seed round"*.
5. **Open your inbox**: one transaction, `openInbox(price, bio)`.
6. **Share**: your link, a QR code and a live "Message me" badge.

### Sender: send a stamp

1. Open someone's link (`/@alice` or `/0x…`).
2. Write a message (up to 1,000 bytes) and, optionally, a reply-to contact.
3. Click **Send**. The app switches your wallet to Arc (adding the chain if needed) and sends `send(to, message)` with the stamp as `msg.value`.
4. It's delivered in under a second. Track it on **Sent**.

### Receiver: triage

- **Reply & refund**: write an optional public reply. `refund(id, reply)` returns the stamp and records the reply in one transaction.
- **Spam: keep**: `keep(id)` and the stamp is yours.
- **Batch**: select several, then refund or keep them all at once.

### Sender: reclaim

If 7 days pass with no answer, the **Reclaim** button unlocks on the Sent page and `reclaim(id)` returns the stamp.

### AI agent

1. `GET /api/v1/stamp?to=@alice&message=…` returns the price, the rules and a ready-to-sign transaction.
2. The agent's own wallet sends it. It's final in under a second.
3. Verify on-chain with `getStamp(id)`, or watch the `Settled` event.

## 5. Every screen, field by field

### Landing (`/`)

| Element | Purpose |
|---|---|
| Kicker *"Refundable paid inbox · Arc"* | Category in four words |
| Headline *"Your attention has a price. Set it."* | The whole product in one line |
| **Open my inbox** / **Try the demo inbox** | Two paths: become a receiver, or try sending to the builder's live inbox |
| Hero demo | Animated envelopes arriving, stamped *Pending*, then *Refunded* or *Kept* |
| Live stats | Stamps sent · refunded to real people · spam paid to receivers, from the contract's lifetime counters |
| Latest on Arc | The most recent stamps, from Circle event monitors, or read directly from the contract when that index is empty |
| How it works | They stamp it → you triage → refund or keep |
| Why Arc | Dollars in and out · $1 stamps make sense · sub-second finality · one click with no approvals |
| For AI agents | The quote-then-send code sample and a link to `/developers` |
| Demo inbox card | *"Send me a stamp. I'll refund you."* |
| Onboarding tour | A short first-visit tour you can skip; it isn't shown again after that |

### Send page (`/@handle` or `/0xaddress`)

| Field | Detail |
|---|---|
| Identity | Identicon, handle or short address, **Copy address**, and verified X/Discord badges when linked |
| Bio | The receiver's one-line headline (max 160 bytes, stored on-chain) |
| Price | *"Charges a $0.10 USDC refundable stamp to reach them"* and a large animated stamp, read live from `priceOf()` |
| Your message | Textarea with a live **byte counter (0/1000)**. Emoji count as 4 bytes, matching the contract |
| Reply-to contact | Optional, published with the message: an X handle or a t.me link. The hint says a public handle is safer than an email address |
| Public warning | *"Messages are public on-chain. Don't include anything secret."* |
| Action button | **Sign in to send** → **Switch to Arc** → **Send with $X stamp**, depending on state. Insufficient USDC is caught before you sign |
| Guarantees | *"You get this back if they reply"* · *"If they don't respond in 7 days, you can reclaim it yourself"* |
| States | Closed inbox (*"This inbox is closed"*, nothing charged), unknown handle (404), invalid address (404) |

### Inbox (`/inbox`)

| Element | Detail |
|---|---|
| Header | *"Open at $X per stamp"* · link to your public page · **Share** · **Settings** · keyboard-help button |
| Money cards | **Pending** (held for you) · **Earned from spam** · **Refunded** |
| Tabs | Pending · Refunded · Kept · Reclaimed · All, with counts |
| Select all | Checkbox for batch actions; a batch bar appears with **Refund N** / **Spam: keep $X** for the selected stamps |
| Envelope card | Sender identicon and address, relative time, stamp id `#n`, message text (loaded from event logs), reply-to contact, the postage stamp and a status postmark |
| Actions | **Reply & refund** (opens a reply box with a byte counter, **Cancel** and **Send reply & refund $X**) · **Spam: keep $X** |
| Keyboard | `J`/`↓` next · `K`/`↑` previous · `X` select · `R` reply & refund · `S` spam · `Esc` close · `Ctrl/⌘+Enter` send reply · `?` help |
| Load older | Paginated through `inboxOf(user, offset, limit)` |
| Owed banner | If a payout to you couldn't be delivered, it waits in the contract with a **Withdraw** button |

### Inbox settings (sheet)

- Change the **price** (presets or custom) and the **bio**. *"Changes apply to new stamps only. Pending stamps keep the amount they were sent with."*
- **Close inbox** stops new stamps; pending ones can still be settled.

### Share panel

- Your inbox link with copy, a **QR code**, and the **"Message me" badge** with copy-paste Markdown/HTML. *"Tip: put the link in your X bio, email signature, or GitHub profile."*

### Sent (`/sent`)

| Element | Detail |
|---|---|
| Money cards | **Awaiting reply** · **Came back to you** · **Kept as spam** |
| Stamp cards | Recipient, time, id, your message, status postmark |
| Reclaim | Disabled with a countdown (*"available in 6d 23h"*) until 7 days pass, then one click |

### Receipt (`/stamp/<id>`)

From, to, message, reply, a dated **Refunded / Kept / Reclaimed / Pending** postmark, then a details table: status, amount, sent time, network, and links to the send and settle transactions on the Arc explorer. Invalid ids show a proper 404.

### Settings / Me (`/settings`)

- **Profile:** display name and handle, shown on your public page.
- **Linked accounts:** link or unlink X, Discord, Google, email or a passkey. *"Keep at least one way to sign in."* Toggles let you show or hide verified X/Discord badges.
- **Wallet:** your address, a QR code and funding help (*"Send USDC on Arc to this address from an exchange or another wallet"*), plus **Export wallet** for embedded wallets.
- **Your data:** download everything we store, or delete your account. *"On-chain stamps can't be deleted by anyone."*

### Developers (`/developers`)

Quote → send → verify, the full response format, error codes (400 bad input · 404 unknown handle · 409 inbox closed), and an example agent written with viem.

### Privacy (`/privacy`)

What's stored (profiles, handles, public event data), what isn't (emails, OAuth tokens, message text off-chain), and the fact that on-chain data is public and permanent.

### Global UI

- **Header:** Inbox · Sent · Open inbox · theme toggle · account button (address, network, sign out).
- **Mobile bottom bar:** Home · Inbox · Sent · Me.
- **Network banner:** *"Wrong network"* with **Switch to Arc**. **Add Arc to wallet** in the footer adds chain 5042 (mainnet) or 5042002 (testnet).
- **Footer:** network switch (Mainnet / Testnet), contract link, GitHub, Arc docs, Developers, Privacy.
- **Themes:** dark (neon night sky) and light, remembered per browser, with WCAG contrast tested.
- **Motion:** an animated backdrop of envelopes on delivery routes, postmarks, rising coins and stamps. It's disabled under `prefers-reduced-motion`.

## 6. The StampBox contract

`contracts/src/StampBox.sol` · Solidity 0.8.30 · OpenZeppelin `ReentrancyGuard` and `SafeCast` · immutable, no owner.

### Storage

```solidity
struct Stamp { address from; address to; uint128 amount; uint64 sentAt; Status status; }
enum Status { Pending, Refunded, Kept, Reclaimed }
uint256 public constant TIMEOUT = 7 days;
uint256 public constant MAX_MESSAGE_BYTES = 1000;
uint256 public constant MAX_BIO_BYTES = 160;
```

Message and reply text are **not** stored. They're emitted in events, which keeps `send` cheap.

### Functions

| Function | Who | What it does |
|---|---|---|
| `openInbox(price, bio)` | anyone | Opens your inbox at a price, with an optional bio |
| `setPrice(price)` | inbox owner | Changes the price for **new** stamps |
| `closeInbox()` | inbox owner | Stops new stamps |
| `send(to, message)` *payable* | anyone | Creates a stamp. `msg.value ≥ price`, and the whole value becomes the stamp |
| `refund(id, reply)` | receiver | Returns the stamp to the sender and emits the reply |
| `keep(id)` | receiver | Pays the stamp to the receiver |
| `reclaim(id)` | sender | Returns the stamp after `TIMEOUT` if it's still pending |
| `batchRefund(ids)` / `batchKeep(ids)` | receiver | Many at once |
| `withdraw()` / `withdrawTo(to)` | anyone owed | Collects payouts that couldn't be delivered automatically |
| `getStamp(id)`, `stampsCount()` | view | Read a stamp, total count |
| `priceOf(user)`, `bioOf(user)`, `owed(user)` | view | Inbox price, bio, deferred balance |
| `inboxCount/outboxCount(user)`, `inboxOf/outboxOf(user, offset, limit)` | view | Paginated stamp ids per user |

### Events

`InboxOpened(user, price, bio)` · `PriceSet(user, price)` · `Sent(id, from, to, amount, message)` · `Settled(id, by, status, reply)` · `PaymentDeferred(id, to, amount)` · `Withdrawn(account, to, amount)`

### Errors

`InboxClosed` · `StampTooSmall` · `NotReceiver` · `NotSender` · `TooEarly` · `AlreadySettled` · `TransferFailed` · `MessageTooLong` · `EmptyMessage` · `SelfSend` · `InvalidPrice` · `BioTooLong` · `InvalidId` · `NothingOwed`

### Invariants

- `address(this).balance == sum(pending stamps) + totalOwed`, fuzzed.
- Each stamp settles exactly once.
- Only the receiver refunds or keeps; only the sender reclaims, and only after 7 days.

### Gas (median)

`send` 188k · `refund` 74k · `keep` 68k · `reclaim` 68k · `withdraw` 29k · `openInbox` 70k. On Arc that's a fraction of a cent each.

## 7. The public API

### `GET /api/v1/stamp`

| Param | Required | Notes |
|---|---|---|
| `to` | yes | An address, `handle` or `@handle` |
| `message` | no | When present, the response includes `tx` |
| `network` | no | `mainnet` (default) or `testnet` |

```json
{
  "network": "mainnet",
  "chainId": 5042,
  "contract": "0x654Ac560d556300830CD7B4e0769aC33826556D4",
  "recipient": { "address": "0x…", "handle": "alice", "url": "https://stamp-topaz.vercel.app/@alice" },
  "inbox": { "open": true, "price": "1000000000000000000", "priceUsdc": "$1.00", "bio": "…" },
  "rules": { "maxMessageBytes": 1000, "refundOnReply": true, "senderCanReclaimAfterSeconds": 604800 },
  "tx": { "chainId": 5042, "to": "0x654A…", "value": "1000000000000000000", "data": "0x…" }
}
```

It's CORS-open, needs no key and never signs anything. Errors come back as `{ "error": "…" }` with 400, 404 or 409.

### `GET /badge/<address|handle>`

An SVG "Message me · $X" badge rendered from live chain state. Add `?theme=light` for light backgrounds.

### Other routes

`/api/health` (feature flags) · `/api/chain/stats` (lifetime counters) · `/api/activity` (latest stamps) · `/api/auth/*`, `/api/me`, `/api/handles` (accounts; Privy-verified, CSRF-protected) · `/api/webhooks/circle` (ECDSA-verified Circle events)

## 8. Architecture

```
Browser (Next.js 16, React 19, wagmi + viem, Privy)
   │  send / refund / keep / reclaim  ──────────────►  StampBox on Arc (escrow + settlement)
   │  reads: view functions + eth_getLogs  ◄──────────  events: Sent, Settled (message & reply text)
   │
   └─ /api (Next.js route handlers: no keys, no funds)
        ├─ auth: Privy token → HttpOnly session + CSRF
        ├─ Postgres (Neon) via Drizzle: profiles, handles, public events
        └─ /api/webhooks/circle ◄── Circle Contracts event monitors on Sent/Settled
```

- **The contract is the source of truth.** The server is an optional convenience layer for names, profiles and a faster activity feed.
- **Graceful degradation:** without Privy the app is a plain wallet client; without a database, accounts hide themselves; without Circle, the feed reads the contract.
- **Performance:** wallet and auth code loads as a separate chunk, only on pages that need a wallet. The landing page scores 91+ on Lighthouse mobile.

## 9. Security and privacy

- **Non-custodial:** funds only ever sit in the immutable contract.
- **No admin:** no owner, pause switch, fee switch or upgrade path.
- **Reentrancy:** checks-effects-interactions plus `ReentrancyGuard`, tested with hostile contracts.
- **Griefing-proof payouts:** capped-gas sends; failures are deferred to `owed` instead of blocking settlement.
- **Web:** strict nonce-based CSP, security headers, HttpOnly SameSite cookies, CSRF tokens and an `Origin` check on writes, zod validation, rate limiting when Upstash is configured.
- **Supply chain:** CodeQL, gitleaks, Dependabot and `pnpm audit` in CI.
- **Privacy:** no emails or OAuth tokens stored; messages are public on-chain, and the UI says so at the point of writing.

## 10. Why Arc

| Arc feature | Why Stamp needs it |
|---|---|
| USDC is the gas token | Senders hold one asset, dollars |
| Dollar-priced, tiny fees | A $0.10–$1 stamp is economically sane |
| Sub-second deterministic finality | Delivery feels like a DM; one confirmation is final |
| Native USDC in `msg.value` | No approve, no allowance, one click |

Implementation details that respect Arc: 18-decimal native USDC (never the 6-decimal ERC-20 view), fees above the 20 Gwei mempool floor, and chain ids 5042 / 5042002.

## 11. Quality and testing

| Layer | Evidence |
|---|---|
| Contract | 70 Foundry tests: unit, fuzz, invariant, reentrancy, payouts, deploy |
| Coverage | 100% lines, statements, branches and functions on `StampBox.sol` |
| Web | Vitest on API routes, auth, CSRF, signatures, webhooks, CSP, formatting, contrast |
| End-to-end | 21/21 checks against an Arc mainnet fork with a scripted wallet, exact balances verified |
| CI | Types, lint, `forge fmt`, gas snapshot, tests, CodeQL, gitleaks, audit on every push |

## 12. Deployments and proof

| Item | Link |
|---|---|
| Live app | https://stamp-topaz.vercel.app |
| Mainnet contract (verified, exact match) | https://explorer.arc.io/address/0x654Ac560d556300830CD7B4e0769aC33826556D4 |
| Testnet contract | https://explorer.testnet.arc.io/address/0x448C8cAB90a6aaCa0692cEBCDDCD06D3cA15d24B |
| Demo inbox ($0.10) | https://stamp-topaz.vercel.app/0x98025B790E3f9F0932D098ADeFA5D9478104CCD2 |
| Refunded receipt | https://stamp-topaz.vercel.app/stamp/0 |
| Kept receipt | https://stamp-topaz.vercel.app/stamp/2 |
| Agent API | https://stamp-topaz.vercel.app/api/v1/stamp?to=0x98025B790E3f9F0932D098ADeFA5D9478104CCD2&message=hi |

## 13. Roadmap

**Shipped:** mainnet escrow, refund/keep/reclaim, batch actions, multi-method sign-in with embedded wallets, handles, agent API, live badge, Circle event monitors.

**Next:**

1. **End-to-end encrypted messages:** keys derived from a wallet signature, X25519 + XChaCha20, so only the receiver can read them.
2. **Allowlist / free tier** for contacts, followers and people you've already replied to.
3. **Agent SDK with an HTTP 402 flow:** ask the price and pay in one round trip.
4. **Cross-chain funding** with Circle's Bridge Kit (CCTP), so senders can pay from any chain.
5. **Notifications** by email, Telegram and push.

## 14. Glossary

| Term | Meaning |
|---|---|
| **Stamp** | The refundable USDC deposit attached to a message |
| **Inbox** | An address that has opened itself to stamps at a price |
| **Refund** | The receiver replies; the stamp goes back to the sender |
| **Keep** | The receiver marks spam; the stamp goes to the receiver |
| **Reclaim** | The sender takes the stamp back after 7 days without an answer |
| **Owed** | A payout that couldn't be delivered automatically, waiting to be withdrawn |
| **Postmark** | The status seal on each envelope: Pending, Refunded, Kept or Reclaimed |
