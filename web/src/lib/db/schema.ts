import { sql } from "drizzle-orm";
import { bigint, index, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Off-chain profile data only. Funds, keys and message plaintext never touch this database.
 * We deliberately don't store email addresses or OAuth tokens: Privy holds those, and we only keep the
 * public usernames needed for verified badges, plus booleans for the rest.
 */

export type LinkedAccount =
  | { type: "twitter"; username: string; avatarUrl?: string }
  | { type: "discord"; username: string; avatarUrl?: string }
  | { type: "github"; username: string }
  | { type: "google" }
  | { type: "email" }
  | { type: "passkey" }
  | { type: "wallet"; address: string; embedded: boolean };

export type Privacy = {
  /** Show the verified X / Discord badge (with username) on the public profile. */
  showTwitter: boolean;
  showDiscord: boolean;
};

export const defaultPrivacy: Privacy = { showTwitter: true, showDiscord: true };

export type AvatarSource = "identicon" | "twitter" | "discord";

export type Onboarding = {
  /** Price picked in step 2, as an 18-decimal string, applied on-chain once the wallet is funded. */
  price?: string;
  headline?: string;
  done?: boolean;
};

export const users = pgTable(
  "users",
  {
    /** Privy DID (did:privy:…) */
    id: text("id").primaryKey(),
    /** Lower-case 0x address of the wallet that receives stamps. */
    address: text("address").notNull(),
    /** [a-z0-9_]{3,20}; bound to `address` by `handleSig`. */
    handle: text("handle"),
    handleSig: text("handle_sig"),
    handleMessage: text("handle_message"),
    displayName: text("display_name"),
    avatarSource: text("avatar_source").$type<AvatarSource>().notNull().default("identicon"),
    accounts: jsonb("accounts").$type<LinkedAccount[]>().notNull().default(sql`'[]'::jsonb`),
    privacy: jsonb("privacy").$type<Privacy>().notNull().default(sql`'{"showTwitter":true,"showDiscord":true}'::jsonb`),
    onboarding: jsonb("onboarding").$type<Onboarding>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_address_idx").on(t.address), uniqueIndex("users_handle_idx").on(t.handle)],
);

export type User = typeof users.$inferSelect;

export type ChainEventKind = "sent" | "settled";
export type StampStatusName = "pending" | "refunded" | "kept" | "reclaimed";

/**
 * StampBox events delivered by Circle's Contracts event monitors (signed webhooks). Public chain data only: no
 * message text is stored, just enough for the "Latest on Arc" feed. The chain stays the source of truth.
 */
export const chainEvents = pgTable(
  "chain_events",
  {
    network: text("network").$type<"mainnet" | "testnet">().notNull(),
    /** uint256 stamp id as a decimal string. */
    stampId: text("stamp_id").notNull(),
    kind: text("kind").$type<ChainEventKind>().notNull(),
    status: text("status").$type<StampStatusName>().notNull(),
    /** Sender for "sent", the settling party for "settled". Lower-case 0x. */
    actor: text("actor").notNull(),
    /** Receiver; only on "sent". */
    receiver: text("receiver"),
    /** 18-decimal native USDC as a decimal string; only on "sent". */
    amount: text("amount"),
    txHash: text("tx_hash").notNull(),
    blockNumber: bigint("block_number", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.network, t.stampId, t.kind] }), index("chain_events_recent_idx").on(t.network, t.blockNumber)],
);

export type ChainEvent = typeof chainEvents.$inferSelect;
