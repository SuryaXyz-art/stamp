// Records a StampBox deployment from Foundry's broadcast log, then regenerates the web app's typed artifacts.
//   node scripts/record-deployment.mjs mainnet   (or testnet)
// Reads broadcast/Deploy.s.sol/<chainId>/run-latest.json, writes deployments/arc-<network>.json and runs export-abi.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const CHAINS = { mainnet: 5042, testnet: 5042002 };
const network = process.argv[2];
if (!(network in CHAINS)) {
  console.error("Usage: node scripts/record-deployment.mjs <mainnet|testnet>");
  process.exit(1);
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const chainId = CHAINS[network];
const log = join(root, "broadcast", "Deploy.s.sol", String(chainId), "run-latest.json");
if (!existsSync(log)) {
  console.error(`No broadcast log at ${log}. Run the deploy with --broadcast first.`);
  process.exit(1);
}

const run = JSON.parse(readFileSync(log, "utf8"));
const receipt = run.receipts.find((r) => r.contractAddress && r.status === "0x1");
if (!receipt) {
  console.error("The broadcast log has no successful contract creation.");
  process.exit(1);
}

// EIP-55 checksum via Foundry's cast (already installed for the deploy); lowercase is still valid if it's missing.
let address = receipt.contractAddress;
try {
  address = execFileSync("cast", ["to-check-sum-address", address], { encoding: "utf8" }).trim();
} catch {}

const out = join(root, "deployments", `arc-${network}.json`);
const record = { chainId, network: `arc-${network}`, address, startBlock: Number(BigInt(receipt.blockNumber)) };
writeFileSync(out, JSON.stringify(record, null, 2) + "\n");
console.log(`Recorded StampBox on Arc ${network}: ${record.address} (block ${record.startBlock})`);

execFileSync(process.execPath, [join(root, "scripts", "export-abi.mjs")], { stdio: "inherit" });
