# Privacy

_Last updated: 10 October 2026. Applies to the Stamp web app and the StampBox v1 contract._

**The short version:** Stamp now has optional accounts (sign in with X, Discord, Google, email, a passkey or a wallet). For an account we keep a small profile: your handle, display name, wallet address and the public usernames of the accounts you linked. **We never store your email address, phone number, OAuth tokens or private keys.** No analytics, no trackers, no ads. **Messages are still written to a public blockchain** until encryption ships: treat every message as if you were posting it publicly under your wallet address.

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

End-to-end encrypted messages are in development. Even then, the sender, receiver, amount, timestamps and status stay public, and messages already sent stay public plaintext permanently.

## What we store (only if you sign in)

| Data | Why | Public? |
|---|---|---|
| Your Privy user ID (a random identifier) | Links your profile to your sign-in | No |
| Your receiving wallet address | Where stamps are paid | Yes (it's on-chain anyway) |
| Your handle and the signature that binds it to your wallet | Your `/@handle` link; anyone can re-check the signature | Yes |
| Display name and avatar choice | Your public profile | Yes |
| Usernames of linked X, Discord and GitHub accounts | Verified badges on your profile | Only if you leave "show" on in Settings → Privacy |
| Whether you linked Google, email or a passkey (yes/no only) | Settings page | No |
| The price and headline you picked during onboarding | Pre-filling onboarding | No (until you publish them on-chain) |

Stored in Postgres (Neon) and kept until you delete your account. **Export it** any time from Settings → Your data (JSON download). **Delete it** from the same place: your profile and handle are removed immediately, and your Privy login is deleted too.

## Who else processes data

| Who | What they can see | Why |
|---|---|---|
| [Privy](https://www.privy.io/privacy-policy) | Your email, social account, passkey and embedded-wallet key shares, per their policy. Your embedded wallet's key never reaches Stamp. | Sign-in and self-custodial wallets |
| X, Discord, Google (only the one you sign in with) | That you used it to sign in to Stamp | OAuth sign-in |
| Our hosting provider (Vercel) | Standard request logs: IP address, user agent, requested URL | Serving the website |
| Our database provider (Neon) | The profile data above | Storage |
| Upstash (if enabled) | Your IP address or user ID, briefly, as a rate-limit counter | Abuse protection |
| The Arc RPC endpoint your browser talks to | Your IP address, the wallet addresses and inboxes you look up, transactions you submit | Reading and writing the blockchain |
| Your external wallet (MetaMask, Rabby, …) and WalletConnect | Whatever their own policies say | Signing transactions |

Profile pictures from X are fetched by our server and re-served from our own domain, so your browser never contacts X just to show an avatar.

## Cookies and browser storage

| Name | Kind | Purpose |
|---|---|---|
| `stamp_session` | HttpOnly cookie, 7 days | Keeps you signed in to Stamp's API (signed; contains only your Privy user ID and a CSRF token) |
| `stamp_csrf` | Cookie, 7 days | Protects your account from cross-site requests |
| `privy:*` | Local storage | Privy's own sign-in session |
| `stamp:signed-in` | Local storage | Remembers to load sign-in on your next visit |
| `stamp:theme`, `stamp:network`, `stamp:tour-done` | Local storage | Light/dark mode, mainnet/testnet, whether you dismissed the tour |
| `wagmi.*` | Local storage | Which wallet you last connected |

All of these are strictly necessary or remember a choice you made; none track you. Signing out clears the cookies; clearing site data removes the rest.

## Your choices

- **Don't put anything private in a message.** Use the reply-to field only for contact details you're happy to publish.
- **Hide your verified badges** in Settings → Privacy.
- **Close your inbox** any time from Inbox → Settings. Existing history stays on-chain.
- **Use a dedicated wallet** for Stamp if you don't want it linked to your other on-chain activity.
- **Self-hosting?** Set `NEXT_PUBLIC_ARC_*_RPC` to your own RPC so the public RPC doesn't see your lookups.

## Deletion

Settings → Your data → Delete account removes everything in "What we store" and deletes your Privy user. On-chain data can't be deleted by anyone. Move any USDC out of your embedded wallet first, or export its key from Settings → Wallet.

## Changes and contact

This policy is updated before any feature that changes what we collect goes live. For questions, open an issue on the repository. For anything sensitive, use the private channel in [SECURITY.md](SECURITY.md).
