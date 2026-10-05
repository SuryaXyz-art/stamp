# Privacy

_Last updated: 5 October 2026. Applies to the Stamp web app and the StampBox v1 contract._

**The short version:** Stamp has no accounts, no database, no cookies, no analytics and no trackers. But **everything you do on Stamp is written to a public blockchain**, and that includes the text of your messages. Treat every message as if you were posting it publicly under your wallet address.

The same text is shown in the app at [`/privacy`](web/src/app/privacy/page.tsx). If the two ever differ, this file is the reference.

## What is public on Arc, forever

StampBox is a smart contract on the Arc blockchain. Anyone can read everything it stores or emits, and **nobody can delete it**, including us.

| Data | Where |
|---|---|
| Your wallet address | Every stamp you send or receive |
| **Message text, including any contact details you type** | `Sent` event and transaction input |
| **Reply text** | `Settled` event and transaction input |
| Who messaged whom, the amount, the time, and whether it was replied to, kept or reclaimed | Contract storage and events |
| Your inbox price and headline (bio) | Contract storage |

Encrypted messages are planned for v2, but even then the sender, receiver, amount, timestamps and status will stay public. Messages sent with v1 will stay public plaintext permanently.

## What we collect

**Nothing on our own servers.** The app has no backend database or user accounts, and it doesn't set cookies.

| Who | What they can see | Why |
|---|---|---|
| Our hosting provider (Vercel) | Standard request logs: IP address, user agent, requested URL | Serving the website |
| The Arc RPC endpoint your browser talks to | Your IP address, the wallet addresses and inboxes you look up, transactions you submit | Reading and writing the blockchain |
| Your wallet (MetaMask, Coinbase Wallet, …) and, if enabled, WalletConnect | Whatever their own privacy policies say | Signing transactions |

## What's stored in your browser

These stay on your device and are never sent to us:

| Key | Purpose |
|---|---|
| `stamp:theme` | Light/dark mode |
| `stamp:network` | Mainnet or testnet |
| `stamp:tour-done` | Whether you've dismissed the intro tour |
| `wagmi.*`, `rk-*` | Which wallet you last connected (set by the wallet libraries) |

Clear your browser's site data to remove them.

## Your choices

- **Don't put anything private in a message.** Use the reply-to field only for contact details you're happy to publish.
- **Close your inbox** at any time from Inbox → Settings. Existing history stays on-chain.
- **Use a dedicated wallet** for Stamp if you don't want it linked to your other on-chain activity.
- **Use your own RPC** by setting `NEXT_PUBLIC_ARC_*_RPC` when you self-host, if you don't want the public RPC to see your lookups.

## Deletion

We hold no personal data, so there's nothing for us to delete. On-chain data can't be deleted by anyone.

## Changes and contact

When accounts, notifications or encryption ship in v2, this policy will be updated before those features go live, and it will list exactly what is stored, where and for how long. For questions, open an issue on the repository. For anything sensitive, use the private channel in [SECURITY.md](SECURITY.md).
