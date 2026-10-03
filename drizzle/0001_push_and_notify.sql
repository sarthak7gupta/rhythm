ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notify_enabled" boolean DEFAULT true NOT NULL;

ALTER TABLE "occurrences" ADD COLUMN IF NOT EXISTS "last_notified_at" timestamp;

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "user_id" text NOT NULL,
  "platform" text DEFAULT 'web' NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text,
  "auth" text,
  "user_agent" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "push_subscriptions"
  ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_user_endpoint_unique"
  ON "push_subscriptions" USING btree ("user_id","endpoint");
