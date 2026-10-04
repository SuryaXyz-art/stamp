# Contributing to Stamp

Thanks for helping! Stamp is small on purpose: one immutable contract and a static web app. Please keep it that way.

## Setup

```bash
git clone --recurse-submodules https://github.com/ritikpandey/stamp && cd stamp
pnpm install
pnpm dev
```

Contracts need [Foundry](https://getfoundry.sh). On Windows, use Git Bash or WSL.

## Before you open a PR

```bash
pnpm test                 # forge test + web typecheck + lint
cd contracts && forge fmt && forge snapshot   # if you touched Solidity
pnpm build                # if you touched the web app
```

CI runs the same checks plus `forge fmt --check`, 100%-coverage reporting and `forge snapshot --check`.

## Guidelines

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org) (`feat(web): …`, `fix(contracts): …`, `docs: …`, `chore: …`).
- **Contract changes:** StampBox is deployed immutably, so changes mean a new deployment. Every new branch needs a test; coverage must stay at 100%. No admin, owner, fee or upgrade paths. That's a product promise.
- **Money in the UI:** never show raw wei. Use `formatUsdc` / `parseUsdc` from `web/src/lib/format.ts`. Native USDC on Arc is 18 decimals; never mix in the 6-decimal ERC-20 view.
- **Transactions:** go through `useStampTx` so every write gets the three toast states and friendly errors.
- **Accessibility:** keyboard reachable, visible focus, labels on icon buttons, AA contrast in both themes, and `prefers-reduced-motion` respected.
- **Mobile:** check every change at 375px wide.
- **Dependencies:** prefer none. If you add one, explain why in the PR.

## After a contract change or deployment

```bash
cd contracts && forge build && cd .. && pnpm abi
```

This regenerates `web/src/generated/` (typed ABI + deployment addresses). Commit the result.

## Security

Found a vulnerability? Please don't open a public issue. Email the maintainer (see the GitHub profile) and allow time for a fix. StampBox is immutable, so the fix will be a new deployment and a migration notice.
