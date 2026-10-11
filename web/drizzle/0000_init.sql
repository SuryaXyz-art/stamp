CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"handle" text,
	"handle_sig" text,
	"handle_message" text,
	"display_name" text,
	"avatar_source" text DEFAULT 'identicon' NOT NULL,
	"accounts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"privacy" jsonb DEFAULT '{"showTwitter":true,"showDiscord":true}'::jsonb NOT NULL,
	"onboarding" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_address_idx" ON "users" USING btree ("address");--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle_idx" ON "users" USING btree ("handle");