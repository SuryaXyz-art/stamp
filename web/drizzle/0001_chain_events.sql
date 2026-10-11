CREATE TABLE "chain_events" (
	"network" text NOT NULL,
	"stamp_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"actor" text NOT NULL,
	"receiver" text,
	"amount" text,
	"tx_hash" text NOT NULL,
	"block_number" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chain_events_network_stamp_id_kind_pk" PRIMARY KEY("network","stamp_id","kind")
);
--> statement-breakpoint
CREATE INDEX "chain_events_recent_idx" ON "chain_events" USING btree ("network","block_number");