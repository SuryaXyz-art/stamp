# Security policy

Stamp holds people's money in an immutable contract, so we take reports seriously and fix them fast.

## Reporting a vulnerability

**Please don't open a public issue.** Report privately through GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository (**Security → Report a vulnerability**).

Please include:

- what is affected (contract function, page, route) and the network (Arc mainnet or testnet)
- steps to reproduce, or a proof of concept (a Foundry test is ideal for contract issues)
- the impact you expect (funds at risk, data exposed, denial of service)

What you can expect:

| | |
|---|---|
| Acknowledgement | within 72 hours |
| First assessment | within 7 days |
| Fix or mitigation plan | as fast as the severity requires; critical issues get priority over everything else |
| Credit | in the advisory and CHANGELOG, if you want it |

We won't take legal action against good-faith research that respects the rules below.

## Rules for research

- Test on **Arc Testnet** with your own wallets. Never touch other people's funds or mainnet stamps you don't own.
- Don't run denial-of-service or spam tests against the hosted app or public RPCs.
- Don't access, change or keep other users' data. Stop and report as soon as you see any.
- Give us reasonable time to fix the issue before you disclose it publicly.

## Scope

| In scope | Out of scope |
|---|---|
| `contracts/src/` (StampBox and future versions) | Arc itself, its RPCs and explorer |
| The web app in `web/` and its HTTP routes | Wallet software (MetaMask, Coinbase Wallet, WalletConnect…) |
| CI/CD and supply-chain issues in this repository | Messages being public on-chain in v1 (documented behaviour, see [PRIVACY.md](PRIVACY.md)) |
| | Spam that someone paid a stamp to send (that's the product working) |

## How fixes ship

StampBox is **immutable with no admin keys**. Nobody, including the maintainers, can pause it, upgrade it or move funds. A contract fix therefore means a **new deployment**: we publish an advisory, deploy the fixed contract, point the web app at it, and show a migration notice. Pending stamps on the old contract can always be settled or reclaimed by their owners.

Web app fixes ship as a normal deploy.

## Security model (summary)

- **Contract:** checks-effects-interactions everywhere plus OpenZeppelin `ReentrancyGuard`; payouts to senders are pushed with a bounded gas stipend and deferred to `withdraw()` if they fail, so no recipient can block settlement; the invariant `balance == pending stamps + owed` is fuzz-tested; 100% line/branch coverage.
- **Web app:** no server-side wallet keys and no custody. It sends a strict nonce-based Content-Security-Policy (Privy and WalletConnect hosts are added only when configured) plus HSTS, `frame-ancestors 'none'`, `nosniff`, a restrictive Permissions-Policy and Referrer-Policy. User text is always rendered as text, never as HTML.
- **Accounts API:** every authenticated route verifies the Privy access token (ES256, issuer and audience checked, locally against the verification key) and our HttpOnly `stamp_session` cookie for the same user; every write also needs a same-origin `Origin`/`Sec-Fetch-Site` and an `x-csrf-token` that matches the signed session (double submit). Inputs are validated with zod (unknown keys rejected, bidi/control characters blocked in names). Handle claims are bound to a linked wallet by an EIP-191 signature over a server-issued, HMAC-protected, 10-minute challenge. Rate limits via Upstash when configured. The integration test suite covers forged, expired and foreign-app tokens, CSRF, cross-origin writes, signature replay and tampering.
- **Supply chain:** exact dependency versions plus a lockfile, `pnpm audit` in CI, Dependabot, CodeQL and gitleaks secret scanning. GitHub Actions are pinned to commit SHAs.

### Accepted advisories

These are ignored in `pnpm-workspace.yaml` because no safe fix exists yet. They are reviewed whenever Dependabot proposes updates.

| Advisory | Package | Why it's accepted |
|---|---|---|
| GHSA-vfj7-8cjw-p6xm | `braces` | No patched release exists. It's only reached through the `shadcn` CLI (a dev dependency) and never ships to browsers. |
| GHSA-vcc3-ghjq-m6fr | `decode-uri-component` | The only fixed version is ESM-only and breaks `query-string`'s `require()`. It's reached only through WalletConnect's client-side URI parsing, so the worst case is a stalled tab for the person who opens a malicious link. |
