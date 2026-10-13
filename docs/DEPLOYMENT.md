# Deploying Stamp

This guide takes Stamp from a fresh clone to a live site with the contract on Arc mainnet. Plan on about 30 minutes, most of it spent creating accounts.

Everything reads one file: **`.env` in the repo root**. Copy `.env.example` to `.env` and fill it in as you go. It's gitignored, so nothing in it gets committed.

```bash
pnpm launch check     # what's set, the deployer balance, and what's left to do
pnpm launch deploy    # deploy StampBox to Arc mainnet, record it, verify the source
pnpm launch env       # write web/.env.local and web/.env.vercel
pnpm launch db        # create the tables in your Neon database
pnpm launch circle    # register StampBox with Circle Contracts and set up the webhook
pnpm launch publish   # optional: create the GitHub repo and push (needs GITHUB_TOKEN)
```

Run `pnpm launch check` whenever you're unsure where you are. It never changes anything.

---

## What goes in `.env`

| Key | Needed for | Where to get it |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | Deploying the contract | A fresh wallet used only for this deploy |
| `NEXT_PUBLIC_SITE_URL` | Share links, OG cards, badges, the Circle webhook | Your Vercel URL, with no trailing slash |
| `DATABASE_URL` | Handles, profiles, the "Latest on Arc" feed | [neon.tech](https://neon.tech) → project → **Connect** |
| `CIRCLE_API_KEY` | Circle Contracts and webhooks | [console.circle.com](https://console.circle.com) → **Keys** (mainnet keys start with `LIVE_API_KEY:`) |
| `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `PRIVY_VERIFICATION_KEY` | Social and email sign-in | [dashboard.privy.io](https://dashboard.privy.io) → **App settings** |
| `NEXT_PUBLIC_DEMO_INBOX` | The "message me" inbox on the landing page | Your own inbox address |
| `NEXT_PUBLIC_ARC_MAINNET_RPC` | Faster log queries | Any RPC provider that supports Arc |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | API rate limits | [console.upstash.com](https://console.upstash.com) → Redis → **REST API** |
| `SESSION_SECRET` | Signed session cookies | Leave it empty. `pnpm launch env` generates one |

Every feature turns itself off when its keys are missing, so you can launch with only the first two rows and add the rest later.

---

## 1. Deploy StampBox to Arc mainnet

Create a **fresh wallet** just for this, put its private key in `DEPLOYER_PRIVATE_KEY`, and send it **at least $0.20 of USDC on Arc mainnet**. USDC is the gas token on Arc, and the deploy costs about $0.09. StampBox has no owner, so this wallet has no special power once the deploy is done.

```bash
pnpm launch deploy
```

The script checks the balance, confirms the RPC really is chain `5042`, deploys, writes `contracts/deployments/arc-mainnet.json` and verifies the source on [explorer.arc.io](https://explorer.arc.io). From then on the web app opens on mainnet by default. Commit `contracts/deployments/arc-mainnet.json` and `web/src/generated/`.

If you'd rather not keep a raw key in a file, use an encrypted Foundry keystore:

```bash
cast wallet import stamp-deployer --interactive
cd contracts
forge script script/Deploy.s.sol --rpc-url arc_mainnet --account stamp-deployer --broadcast
pnpm record mainnet
```

## 2. Publish the repo

Create an empty public repository on GitHub. Don't add a README, `.gitignore` or license, since the repo already has them. Then:

```bash
git remote add origin https://github.com/<you>/stamp.git
git push -u origin HEAD:main
```

Or put a `GITHUB_TOKEN` in `.env` and run `pnpm launch publish`. It creates the repo, refuses to push if any value from your `.env` files appears in the git history, and never saves the token in your git config.

## 3. Deploy the web app on Vercel

1. [vercel.com/new](https://vercel.com/new) → import the repo → set **Root Directory** to `web` → **Deploy**.
2. Put the URL Vercel gives you in `NEXT_PUBLIC_SITE_URL`.
3. Run `pnpm launch env`, then paste the whole of `web/.env.vercel` into **Project → Settings → Environment Variables** and redeploy.
4. If you use Privy, add the Vercel domain to its allowed origins.

## 4. Database

With a Neon connection string in `DATABASE_URL`:

```bash
pnpm launch db
```

For local development you can skip Neon entirely: `DATABASE_URL=pglite:./.data/pglite` runs Postgres in-process and migrates itself.

## 5. Circle Contracts and webhooks

Run this after the Vercel deploy, so the webhook URL exists and already has the API key:

```bash
pnpm launch circle             # mainnet (LIVE_API_KEY)
pnpm launch circle --testnet   # testnet (TEST_API_KEY)
```

It imports StampBox into Circle Contracts, creates event monitors for `Sent` and `Settled`, and subscribes `https://<your site>/api/webhooks/circle` to `contracts.eventLog`. The app checks Circle's ECDSA signature on every delivery and stores only public event data, never message text. Deliveries show up in the console under **Contracts → Monitoring**.

## 6. Seed some real activity

An empty contract looks like a demo, and a few settled stamps look like a product.

1. Open your own inbox on mainnet at a low price, for example $0.10.
2. From a second wallet, send it three stamps. Reply to one, keep one as spam and leave one pending, so every state has a real receipt.
3. Put your inbox address in `NEXT_PUBLIC_DEMO_INBOX` and redeploy.

## 7. Smoke test

- [ ] The landing page shows live numbers and links to the contract on explorer.arc.io.
- [ ] `/<your address>` loads, and a stamp sent from another wallet shows up in `/inbox` within seconds.
- [ ] A refunded stamp's `/stamp/<id>` receipt links to both transactions.
- [ ] `/api/v1/stamp?to=<your address>&message=hi` returns JSON with a `tx` object.
- [ ] `/badge/<your address>` renders your price.
- [ ] Pasting your inbox link into X or Discord shows the preview card.
- [ ] A new stamp appears under **Latest on Arc** on the landing page and in the Circle console.
