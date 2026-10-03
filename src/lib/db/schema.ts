import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  unique,
  bigint,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "@auth/core/adapters";

export const categoryEnum = pgEnum("category", [
  "household",
  "hygiene",
  "external",
  "other",
]);

export const rruleKindEnum = pgEnum("rrule_kind", [
  "every_n_days",
  "weekly",
  "monthly",
]);

export const occurrenceStatusEnum = pgEnum("occurrence_status", [
  "pending",
  "done",
  "skipped",
]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  notifyEnabled: boolean("notify_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);

export const routines = pgTable("routines", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes"),
  category: categoryEnum("category").notNull().default("other"),
  rruleKind: rruleKindEnum("rrule_kind").notNull(),
  intervalDays: integer("interval_days"),
  weekday: integer("weekday"),
  monthDay: integer("month_day"),
  preferredTime: text("preferred_time"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  active: boolean("active").notNull().default(true),
  anchorDate: timestamp("anchor_date", { mode: "date" }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const occurrences = pgTable(
  "occurrences",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    routineId: bigint("routine_id", { mode: "number" })
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    dueAt: timestamp("due_at", { mode: "date" }).notNull(),
    snoozedUntil: timestamp("snoozed_until", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),
    status: occurrenceStatusEnum("status").notNull().default("pending"),
    lastNotifiedAt: timestamp("last_notified_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("occurrences_routine_due_unique").on(
      table.routineId,
      table.dueAt,
    ),
  ],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").notNull().default("web"),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh"),
    auth: text("auth"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    unique("push_subscriptions_user_endpoint_unique").on(
      table.userId,
      table.endpoint,
    ),
  ],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { mode: "date" }).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  routines: many(routines),
  accounts: many(accounts),
  sessions: many(sessions),
  pushSubscriptions: many(pushSubscriptions),
}));

export const routinesRelations = relations(routines, ({ one, many }) => ({
  user: one(users, {
    fields: [routines.userId],
    references: [users.id],
  }),
  occurrences: many(occurrences),
}));

export const occurrencesRelations = relations(occurrences, ({ one }) => ({
  routine: one(routines, {
    fields: [occurrences.routineId],
    references: [routines.id],
  }),
}));

export const pushSubscriptionsRelations = relations(
  pushSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [pushSubscriptions.userId],
      references: [users.id],
    }),
  }),
);

export type User = typeof users.$inferSelect;
export type Routine = typeof routines.$inferSelect;
export type Occurrence = typeof occurrences.$inferSelect;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type Category = (typeof categoryEnum.enumValues)[number];
export type RruleKind = (typeof rruleKindEnum.enumValues)[number];
export type OccurrenceStatus = (typeof occurrenceStatusEnum.enumValues)[number];
