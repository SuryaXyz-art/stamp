#!/usr/bin/env node
// Stamp launch helper. Everything reads the root `.env` (copy `.env.example`).
//
//   pnpm launch check                 what's configured, deployer balance, what's left to do
//   pnpm launch deploy                deploy StampBox to Arc mainnet, record it, verify the source
//   pnpm launch circle [--testnet]    register StampBox in Circle Contracts + event monitors + webhook
//   pnpm launch env                   write web/.env.local and web/.env.vercel (paste into Vercel)
//   pnpm launch db                    create/upgrade the tables in your Neon DATABASE_URL
//   pnpm launch publish               create the public GitHub repo and push (needs GITHUB_TOKEN)
//
// Secrets never leave this machine except to the service they belong to (Arc RPC, Circle, GitHub).
import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const web = join(root, "web");
const contracts = join(root, "contracts");
const requireWeb = createRequire(join(web, "package.json"));

const NETWORKS = {
  mainnet: { chainId: 5042, rpc: "https://rpc.mainnet.arc.io", explorer: "https://explorer.arc.io", circle: "ARC", file: "arc-mainnet.json" },
  testnet: { chainId: 5042002, rpc: "https://rpc.testnet.arc.io", explorer: "https://explorer.testnet.arc.io", circle: "ARC-TESTNET", file: "arc-testnet.json" },
};

/** Keys copied into the web app. Deploy and GitHub credentials are deliberately not in this list. */
const WEB_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_REPO_URL",
  "NEXT_PUBLIC_DEMO_INBOX",
  "NEXT_PUBLIC_ARC_MAINNET_RPC",
  "NEXT_PUBLIC_PRIVY_APP_ID",
  "PRIVY_VERIFICATION_KEY",
  "PRIVY_APP_SECRET",
  "SESSION_SECRET",
  "DATABASE_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "CIRCLE_API_KEY",
];

const EVENTS = ["Sent(uint256,address,address,uint256,string)", "Settled(uint256,address,uint8,string)"];

// ───────────────────────────── small helpers ─────────────────────────────

const c = { ok: (s) => `\x1b[32m${s}\x1b[0m`, warn: (s) => `\x1b[33m${s}\x1b[0m`, bad: (s) => `\x1b[31m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m` };
const fail = (msg) => {
  msg = msg.replace(/\.\.(?=\s|$)/g, ".");
  console.error(c.bad(`✗ ${msg}`));
  process.exit(1);
};

/** Minimal dotenv: KEY=value, quoted values (multi-line inside double quotes), # comments. */
function parseEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  // [ \t] rather than \s: an empty `KEY=` must not swallow the next line as its value.
  const re = /^[ \t]*([A-Z0-9_]+)[ \t]*=[ \t]*("(?:[^"\\]|\\.)*"|'[^'\n]*'|[^\n]*)/gm;
  for (const m of text.matchAll(re)) {
    let v = m[2].trim();
    if (v.startsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"');
    else if (v.startsWith("'")) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, "").trim();
    out[m[1]] = v;
  }
  return out;
}

function serializeEnv(obj, header) {
  const lines = [header, ""];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    const needsQuotes = /[\s#"'\n]/.test(v);
    lines.push(`${k}=${needsQuotes ? `"${v.replace(/\n/g, "\\n").replace(/"/g, '\\"')}"` : v}`);
  }
  return lines.join("\n") + "\n";
}

const env = parseEnv(join(root, ".env"));
const val = (k) => (env[k] ?? "").trim();
const mainnetRpc = () => val("NEXT_PUBLIC_ARC_MAINNET_RPC") || NETWORKS.mainnet.rpc;
const rpcFor = (network) => (network === "mainnet" ? mainnetRpc() : NETWORKS.testnet.rpc);

function deployment(network) {
  const f = join(contracts, "deployments", NETWORKS[network].file);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}

/** One JSON-RPC call; throws on an RPC error. */
async function rpc(url, method, params) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body.result;
}

/** Address for DEPLOYER_PRIVATE_KEY, or null when it isn't set. The key itself never leaves this process except to forge. */
function deployerAddress() {
  const key = val("DEPLOYER_PRIVATE_KEY");
  if (!key) return null;
  const { privateKeyToAccount } = requireWeb("viem/accounts");
  try {
    return privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`).address;
  } catch {
    fail("DEPLOYER_PRIVATE_KEY isn't a valid private key (64 hex characters).");
  }
}

/** A mainnet deploy measured ~$0.09 of gas; ask for some headroom. */
const MIN_DEPLOY_BALANCE = 2n * 10n ** 17n; // $0.20

const usdc = (weiHex) => (Number(BigInt(weiHex)) / 1e18).toFixed(4);

/** Calls Circle's API with CIRCLE_API_KEY and returns the status plus parsed body (or the raw text as `message`). */
async function circle(method, path, body) {
  const res = await fetch(`https://api.circle.com${path}`, {
    method,
    headers: { authorization: `Bearer ${val("CIRCLE_API_KEY")}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text };
  }
  return { status: res.status, json };
}

function git(args, opts = {}) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();
}

function originUrl() {
  try {
    return git(["remote", "get-url", "origin"]).replace(/\.git$/, "");
  } catch {
    return "";
  }
}

// ───────────────────────────── commands ─────────────────────────────

/** Read-only status report: which keys are set, deployer balance, deployments, Circle key, git remote. */
async function check() {
  console.log("\nStamp launch check\n");
  if (!existsSync(join(root, ".env"))) console.log(c.warn("! No .env yet. Copy .env.example to .env and fill it in.\n"));

  const rows = [
    ["DEPLOYER_PRIVATE_KEY", "required to deploy on mainnet"],
    ["CIRCLE_API_KEY", "Circle Contracts + webhooks"],
    ["NEXT_PUBLIC_SITE_URL", "required after the Vercel import"],
    ["NEXT_PUBLIC_DEMO_INBOX", "recommended"],
    ["NEXT_PUBLIC_ARC_MAINNET_RPC", "recommended"],
    ["GITHUB_TOKEN", "optional, for `launch publish`"],
    ["NEXT_PUBLIC_PRIVY_APP_ID", "social sign-in"],
    ["PRIVY_VERIFICATION_KEY", "social sign-in"],
    ["DATABASE_URL", "accounts + activity feed (Neon)"],
    ["UPSTASH_REDIS_REST_URL", "rate limits"],
  ];
  for (const [k, why] of rows) console.log(`  ${val(k) ? c.ok("✓") : c.dim("·")} ${k.padEnd(28)} ${c.dim(why)}`);

  console.log("");
  const addr = deployerAddress();
  if (addr) {
    try {
      const bal = await rpc(mainnetRpc(), "eth_getBalance", [addr, "latest"]);
      const n = BigInt(bal);
      console.log(`  Deployer ${addr}: ${n >= MIN_DEPLOY_BALANCE ? c.ok(`$${usdc(bal)} USDC`) : c.bad(`$${usdc(bal)} USDC: send it at least $0.20 of USDC on Arc mainnet`)}`);
    } catch (e) {
      console.log(c.warn(`  Couldn't read the deployer balance from ${mainnetRpc()}: ${e.message}`));
    }
  }

  for (const n of ["mainnet", "testnet"]) {
    const d = deployment(n);
    console.log(`  StampBox on Arc ${n}: ${d ? c.ok(`${d.address} (block ${d.startBlock})`) : c.warn("not deployed")}`);
  }

  if (val("CIRCLE_API_KEY")) {
    const r = await circle("GET", "/v1/w3s/contracts?pageSize=50");
    if (r.status === 200) {
      const mine = (r.json.data?.contracts ?? []).filter((x) => x.name === "StampBox");
      console.log(`  Circle API key: ${c.ok("valid")}${mine.length ? `, StampBox registered on ${mine.map((x) => x.blockchain).join(", ")}` : c.warn(", StampBox not registered yet")}`);
    } else console.log(`  Circle API key: ${c.bad(`rejected (${r.status}) ${r.json.message ?? ""}`)}`);
  }

  const origin = originUrl();
  console.log(`  GitHub remote: ${origin ? c.ok(origin) : c.warn("none yet")}`);

  console.log("\nNext:");
  const next = [];
  if (!deployment("mainnet")) next.push(addr ? "pnpm launch deploy" : "put DEPLOYER_PRIVATE_KEY in .env (fresh wallet with ~$1 USDC on Arc mainnet)");
  if (!origin) next.push(val("GITHUB_TOKEN") ? "pnpm launch publish" : "create the GitHub repo (or add GITHUB_TOKEN and run pnpm launch publish)");
  if (!val("NEXT_PUBLIC_SITE_URL")) next.push("import the repo in Vercel (root directory: web), then put its URL in NEXT_PUBLIC_SITE_URL");
  next.push("pnpm launch env   (then paste web/.env.vercel into Vercel → Settings → Environment Variables)");
  if (/^postgres/.test(val("DATABASE_URL"))) next.push("pnpm launch db   (creates the tables in Neon)");
  if (val("CIRCLE_API_KEY") && deployment("mainnet")) next.push("pnpm launch circle");
  next.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log("");
}

/** Deploys StampBox to Arc mainnet with forge, records the address for the web app, then verifies the source. */
async function deploy() {
  const force = process.argv.includes("--force");
  if (deployment("mainnet") && !force) fail(`StampBox is already deployed on mainnet (${deployment("mainnet").address}). Pass --force to deploy a new one.`);
  const addr = deployerAddress();
  if (!addr) fail("Put DEPLOYER_PRIVATE_KEY in .env first.");
  const bal = BigInt(await rpc(mainnetRpc(), "eth_getBalance", [addr, "latest"]));
  if (bal < MIN_DEPLOY_BALANCE) fail(`The deployer ${addr} has $${usdc("0x" + bal.toString(16))} USDC on Arc mainnet. Send it at least $0.20 (the deploy costs ~$0.09).`);
  const chainId = Number(await rpc(mainnetRpc(), "eth_chainId", []));
  if (chainId !== NETWORKS.mainnet.chainId) fail(`${mainnetRpc()} reports chain ${chainId}, not Arc mainnet (5042).`);

  console.log(`Deploying StampBox to Arc mainnet from ${addr} ($${usdc("0x" + bal.toString(16))} USDC)…`);
  const key = val("DEPLOYER_PRIVATE_KEY");
  const r = spawnSync("forge", ["script", "script/Deploy.s.sol", "--rpc-url", mainnetRpc(), "--broadcast"], {
    cwd: contracts,
    stdio: "inherit",
    env: { ...process.env, DEPLOYER_PRIVATE_KEY: key.startsWith("0x") ? key : `0x${key}` }
  });
  if (r.status !== 0) fail("forge script failed (see above). Nothing was recorded.");

  execFileSync(process.execPath, [join(contracts, "scripts", "record-deployment.mjs"), "mainnet"], { stdio: "inherit" });
  const d = deployment("mainnet");

  console.log("\nVerifying the source on explorer.arc.io (best effort)…");
  const v = spawnSync(
    "forge",
    ["verify-contract", d.address, "src/StampBox.sol:StampBox", "--chain-id", "5042", "--verifier", "blockscout", "--verifier-url", `${NETWORKS.mainnet.explorer}/api/`, "--watch"],
    { cwd: contracts, stdio: "inherit" },
  );
  if (v.status !== 0) console.log(c.warn("! Verification didn't finish. The contract works regardless; retry later with the same command."));

  console.log(c.ok(`\n✓ StampBox is live on Arc mainnet: ${NETWORKS.mainnet.explorer}/address/${d.address}`));
  console.log("  The web app now opens on mainnet by default. Commit contracts/deployments/arc-mainnet.json and web/src/generated.");
}

/** Imports StampBox into Circle Contracts, adds event monitors and subscribes the site's webhook. Safe to re-run. */
async function registerCircle() {
  const network = process.argv.includes("--testnet") ? "testnet" : "mainnet";
  const net = NETWORKS[network];
  if (!val("CIRCLE_API_KEY")) fail("Put CIRCLE_API_KEY in .env first (console.circle.com → Keys).");
  const d = deployment(network);
  if (!d) fail(`StampBox isn't deployed on ${network} yet.`);

  console.log(`Registering StampBox ${d.address} in Circle Contracts (${net.circle})…`);
  const imp = await circle("POST", "/v1/w3s/contracts/import", {
    idempotencyKey: randomUUID(),
    name: "StampBox",
    description: "Stamp: refundable paid inbox on Arc",
    address: d.address,
    blockchain: net.circle,
  });
  if (imp.status === 200 || imp.status === 201) console.log(c.ok("  ✓ Imported. It now shows under Contracts in console.circle.com."));
  else if (/exist/i.test(imp.json.message ?? "")) console.log(c.ok("  ✓ Already imported."));
  else fail(`Import failed (${imp.status}): ${imp.json.message ?? JSON.stringify(imp.json)}. Is this a ${network === "mainnet" ? "LIVE" : "TEST"} API key?`);

  for (const eventSignature of EVENTS) {
    const m = await circle("POST", "/v1/w3s/contracts/monitors", { idempotencyKey: randomUUID(), blockchain: net.circle, contractAddress: d.address, eventSignature });
    if (m.status === 200 || m.status === 201) console.log(c.ok(`  ✓ Event monitor: ${eventSignature}`));
    else if (/exist/i.test(m.json.message ?? "")) console.log(c.ok(`  ✓ Event monitor already exists: ${eventSignature}`));
    else fail(`Creating the ${eventSignature} monitor failed (${m.status}): ${m.json.message ?? JSON.stringify(m.json)}`);
  }

  const site = val("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");
  if (!site.startsWith("https://")) {
    console.log(c.warn("\n! NEXT_PUBLIC_SITE_URL isn't an https URL yet, so the webhook wasn't registered. Re-run this after the Vercel deploy."));
    return;
  }
  const endpoint = `${site}/api/webhooks/circle`;
  const subs = await circle("GET", "/v2/notifications/subscriptions");
  if ((subs.json.data ?? []).some((s) => s.endpoint === endpoint)) {
    console.log(c.ok(`  ✓ Webhook already registered: ${endpoint}`));
    return;
  }
  const sub = await circle("POST", "/v2/notifications/subscriptions", { endpoint, notificationTypes: ["contracts.eventLog"] });
  if (sub.status === 200 || sub.status === 201) console.log(c.ok(`  ✓ Webhook registered: ${endpoint}`));
  else console.log(c.warn(`! Webhook registration failed (${sub.status}): ${sub.json.message ?? ""}. Make sure the site is deployed with CIRCLE_API_KEY set, then re-run.`));
}

/** Copies the web keys from the root .env into web/.env.local (dev) and web/.env.vercel (production). */
function writeEnvFiles() {
  const localFile = join(web, ".env.local");
  const local = parseEnv(localFile);
  const merged = { ...local };
  for (const k of WEB_KEYS) if (val(k)) merged[k] = val(k);
  merged.SESSION_SECRET ||= randomBytes(36).toString("base64url");
  merged.DATABASE_URL ||= "pglite:./.data/pglite";
  if (!merged.NEXT_PUBLIC_REPO_URL && originUrl()) merged.NEXT_PUBLIC_REPO_URL = originUrl();
  writeFileSync(localFile, serializeEnv(merged, "# Written by `pnpm launch env` from the root .env. Local development values."));
  console.log(c.ok(`✓ Wrote web/.env.local (${Object.keys(merged).length} keys)`));

  const prod = {};
  for (const k of WEB_KEYS) {
    const v = merged[k];
    if (!v) continue;
    if (k === "DATABASE_URL" && v.startsWith("pglite:")) continue; // in-process Postgres doesn't survive serverless
    prod[k] = v;
  }
  const out = join(web, ".env.vercel");
  writeFileSync(out, serializeEnv(prod, "# Paste this whole file into Vercel → Project → Settings → Environment Variables (Production). Gitignored."));
  console.log(c.ok(`✓ Wrote web/.env.vercel (${Object.keys(prod).length} keys) for Vercel`));
  if (!prod.DATABASE_URL) console.log(c.warn("! No production DATABASE_URL: sign-in, handles and the activity feed stay off on Vercel until you add Neon."));
  if (!prod.NEXT_PUBLIC_SITE_URL) console.log(c.warn("! NEXT_PUBLIC_SITE_URL is empty: share links and badges will point at the default domain."));
}

/** Creates the public GitHub repo if needed and pushes HEAD to main, after checking the history for leaked secrets. */
async function publish() {
  const token = val("GITHUB_TOKEN");
  const repo = val("GITHUB_REPO") || "stamp";
  if (!token) fail("Put GITHUB_TOKEN in .env first, or create the repo on github.com and add it as the origin remote yourself.");
  const gh = async (method, path, body) => {
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };

  if (git(["status", "--porcelain"])) fail("You have uncommitted changes. Commit them first so exactly what you reviewed is published.");

  // Refuse to publish if any secret from .env or web/.env.local appears anywhere in the history being pushed.
  const SECRET_KEYS = ["DEPLOYER_PRIVATE_KEY", "CIRCLE_API_KEY", "GITHUB_TOKEN", "PRIVY_APP_SECRET", "PRIVY_VERIFICATION_KEY", "SESSION_SECRET", "DATABASE_URL", "UPSTASH_REDIS_REST_TOKEN"];
  const local = parseEnv(join(web, ".env.local"));
  const secrets = SECRET_KEYS.flatMap((k) => [env[k], local[k]]).filter((v) => v && v.length >= 16 && !v.startsWith("pglite:"));
  const history = git(["log", "-p", "HEAD"], { maxBuffer: 512 * 1024 * 1024 });
  const leaked = secrets.filter((s) => history.includes(s));
  if (leaked.length) fail(`${leaked.length} value(s) from your .env files appear in the git history. Not publishing.`);
  console.log(c.ok("✓ No .env secrets found in the history"));

  const me = await gh("GET", "/user");
  if (me.status !== 200) fail(`GitHub rejected the token (${me.status}).`);
  const login = me.json.login;
  let r = await gh("GET", `/repos/${login}/${repo}`);
  if (r.status === 404) {
    r = await gh("POST", "/user/repos", { name: repo, private: false, description: "A refundable paid inbox on Arc. Reply and they're refunded; spam pays you.", homepage: val("NEXT_PUBLIC_SITE_URL") || undefined });
    if (r.status !== 201) fail(`Couldn't create ${login}/${repo} (${r.status}): ${r.json.message ?? ""}`);
    console.log(c.ok(`✓ Created https://github.com/${login}/${repo}`));
  } else if (r.status === 200) {
    if (r.json.private) console.log(c.warn(`! ${login}/${repo} is private. Make it public in its settings before submitting.`));
    console.log(c.ok(`✓ Using https://github.com/${login}/${repo}`));
  } else fail(`Couldn't read ${login}/${repo} (${r.status}).`);

  const url = `https://github.com/${login}/${repo}.git`;
  if (!originUrl()) git(["remote", "add", "origin", url]);
  const auth = Buffer.from(`${login}:${token}`).toString("base64");
  // The token goes in a one-off header, never into the saved remote URL or git config.
  const push = spawnSync("git", ["-c", `http.extraheader=AUTHORIZATION: basic ${auth}`, "push", url, "HEAD:main"], { cwd: root, stdio: "inherit" });
  if (push.status !== 0) fail("git push failed (see above).");
  console.log(c.ok(`✓ Pushed to https://github.com/${login}/${repo} (branch main)`));
  console.log(`\nNext: vercel.com/new → import ${login}/${repo} → Root Directory: web → Environment Variables: paste web/.env.vercel → Deploy.`);
}

/** Applies the Drizzle migrations in web/drizzle to the Neon database in DATABASE_URL. */
function migrate() {
  const url = val("DATABASE_URL");
  if (!/^postgres(ql)?:\/\//.test(url)) fail("Put your Neon postgres:// connection string in DATABASE_URL first. (Local pglite databases migrate themselves.)");
  const r = spawnSync(process.execPath, [join(web, "node_modules", "drizzle-kit", "bin.cjs"), "migrate"], { cwd: web, stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  if (r.status !== 0) fail("Migration failed (see above).");
  console.log(c.ok("✓ Database is up to date"));
}

const commands = { check, deploy, circle: registerCircle, env: writeEnvFiles, db: migrate, publish };
const cmd = process.argv[2];
if (!commands[cmd]) {
  console.log("Usage: pnpm launch <check|deploy|circle|env|db|publish>");
  process.exit(cmd ? 1 : 0);
}
await commands[cmd]();
