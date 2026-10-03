CREATE TYPE "public"."category" AS ENUM('household', 'hygiene', 'external', 'other');
CREATE TYPE "public"."rrule_kind" AS ENUM('every_n_days', 'weekly', 'monthly');
CREATE TYPE "public"."occurrence_status" AS ENUM('pending', 'done', 'skipped');

CREATE TABLE "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text,
  "emailVerified" timestamp,
  "image" text,
  "timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "accounts" (
  "userId" text NOT NULL,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "providerAccountId" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);

CREATE TABLE "sessions" (
  "sessionToken" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL,
  "expires" timestamp NOT NULL
);

CREATE TABLE "verificationTokens" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  CONSTRAINT "verificationTokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);

CREATE TABLE "routines" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "user_id" text NOT NULL,
  "title" text NOT NULL,
  "notes" text,
  "category" "category" DEFAULT 'other' NOT NULL,
  "rrule_kind" "rrule_kind" NOT NULL,
  "interval_days" integer,
  "weekday" integer,
  "month_day" integer,
  "preferred_time" text DEFAULT '09:00' NOT NULL,
  "timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "anchor_date" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "occurrences" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "routine_id" bigint NOT NULL,
  "due_at" timestamp NOT NULL,
  "completed_at" timestamp,
  "status" "occurrence_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "routines" ADD CONSTRAINT "routines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "occurrences_routine_due_unique" ON "occurrences" USING btree ("routine_id","due_at");
CREATE INDEX "routines_user_id_idx" ON "routines" USING btree ("user_id");
CREATE INDEX "occurrences_routine_id_idx" ON "occurrences" USING btree ("routine_id");
CREATE INDEX "occurrences_due_at_idx" ON "occurrences" USING btree ("due_at");
