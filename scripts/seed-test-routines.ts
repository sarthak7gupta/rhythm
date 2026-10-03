import { config as loadDotenv } from "dotenv";
import { addDays, startOfDay, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { occurrences, routines, users } from "@/lib/db/schema";
import { ensureOccurrencesForRoutine } from "@/lib/occurrences/ensure";
import { dueAtForLocalDay } from "@/lib/recurrence";

loadDotenv({ path: ".env.local" });

const TARGET_EMAIL = "rsarthakgupta@gmail.com";
const TZ = "Asia/Kolkata";

type Seed = {
  title: string;
  notes: string;
  category: "household" | "hygiene" | "external" | "other";
  rruleKind: "every_n_days" | "weekly" | "monthly";
  intervalDays?: number | null;
  weekday?: number | null;
  monthDay?: number | null;
  preferredTime?: string | null;
  active?: boolean;
  /** Days before today for every_n_days start. */
  anchorDaysAgo?: number;
  /** Also leave a pending occurrence this many days ago (overdue). */
  overdueDaysAgo?: number;
};

const SEEDS: Seed[] = [
  {
    title: "Water the plants",
    notes: "Daily, day-only.",
    category: "household",
    rruleKind: "every_n_days",
    intervalDays: 1,
  },
  {
    title: "Morning meds",
    notes: "Daily with a clock time.",
    category: "hygiene",
    rruleKind: "every_n_days",
    intervalDays: 1,
    preferredTime: "08:00",
  },
  {
    title: "Wipe bathroom sink",
    notes: "Every 2 days.",
    category: "household",
    rruleKind: "every_n_days",
    intervalDays: 2,
    overdueDaysAgo: 2,
  },
  {
    title: "Kitchen counters",
    notes: "Every 3 days.",
    category: "household",
    rruleKind: "every_n_days",
    intervalDays: 3,
    anchorDaysAgo: 3,
  },
  {
    title: "Change bed sheets",
    notes: "Weekly-ish interval.",
    category: "household",
    rruleKind: "every_n_days",
    intervalDays: 7,
  },
  {
    title: "Trim nails",
    notes: "Every 14 days.",
    category: "hygiene",
    rruleKind: "every_n_days",
    intervalDays: 14,
    anchorDaysAgo: 14,
  },
  {
    title: "Haircut",
    notes: "Every 35 days.",
    category: "hygiene",
    rruleKind: "every_n_days",
    intervalDays: 35,
    anchorDaysAgo: 40,
  },
  {
    title: "Replace contact lenses",
    notes: "Every 30 days.",
    category: "hygiene",
    rruleKind: "every_n_days",
    intervalDays: 30,
    preferredTime: "21:00",
  },
  {
    title: "Take bins out",
    notes: "Weekly on Sunday.",
    category: "household",
    rruleKind: "weekly",
    weekday: 0,
    overdueDaysAgo: 6,
  },
  {
    title: "Grocery run",
    notes: "Weekly on Saturday (today).",
    category: "household",
    rruleKind: "weekly",
    weekday: 6,
  },
  {
    title: "Laundry",
    notes: "Weekly on Monday.",
    category: "household",
    rruleKind: "weekly",
    weekday: 1,
  },
  {
    title: "Call mum",
    notes: "Weekly on Wednesday.",
    category: "other",
    rruleKind: "weekly",
    weekday: 3,
    preferredTime: "19:30",
  },
  {
    title: "Gym",
    notes: "Weekly Thursday with time.",
    category: "hygiene",
    rruleKind: "weekly",
    weekday: 4,
    preferredTime: "18:00",
  },
  {
    title: "Pay rent",
    notes: "Monthly on the 1st — should be overdue this month.",
    category: "external",
    rruleKind: "monthly",
    monthDay: 1,
    overdueDaysAgo: 2,
  },
  {
    title: "Water filter",
    notes: "Monthly on the 1st.",
    category: "household",
    rruleKind: "monthly",
    monthDay: 1,
  },
  {
    title: "Car insurance check",
    notes: "Monthly on the 3rd (today).",
    category: "external",
    rruleKind: "monthly",
    monthDay: 3,
  },
  {
    title: "Review subscriptions",
    notes: "Monthly on the 15th.",
    category: "external",
    rruleKind: "monthly",
    monthDay: 15,
  },
  {
    title: "Credit card payment",
    notes: "Monthly on the 31st (clamped in short months).",
    category: "external",
    rruleKind: "monthly",
    monthDay: 31,
  },
  {
    title: "Old gym membership",
    notes: "Paused — should not appear on Today.",
    category: "hygiene",
    rruleKind: "weekly",
    weekday: 5,
    active: false,
  },
];

async function main() {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, TARGET_EMAIL))
    .limit(1);
  if (!user) {
    throw new Error(`No user for ${TARGET_EMAIL}`);
  }

  const now = new Date();
  const localToday = startOfDay(toZonedTime(now, TZ));
  let created = 0;
  let skipped = 0;

  for (const seed of SEEDS) {
    const existing = await db.query.routines.findFirst({
      where: (table, { and, eq: equals }) =>
        and(equals(table.userId, user.id), equals(table.title, seed.title)),
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const anchorDate = seed.anchorDaysAgo
      ? addDays(localToday, -seed.anchorDaysAgo)
      : now;

    const [routine] = await db
      .insert(routines)
      .values({
        userId: user.id,
        title: seed.title,
        notes: seed.notes,
        category: seed.category,
        rruleKind: seed.rruleKind,
        intervalDays:
          seed.rruleKind === "every_n_days" ? (seed.intervalDays ?? 1) : null,
        weekday: seed.rruleKind === "weekly" ? (seed.weekday ?? 0) : null,
        monthDay: seed.rruleKind === "monthly" ? (seed.monthDay ?? 1) : null,
        preferredTime: seed.preferredTime ?? null,
        timezone: TZ,
        active: seed.active ?? true,
        anchorDate,
      })
      .returning();

    if (!routine) continue;
    await ensureOccurrencesForRoutine(routine);

    if (seed.overdueDaysAgo != null && routine.active) {
      const overdueLocal = subDays(localToday, seed.overdueDaysAgo);
      const dueAt = dueAtForLocalDay(
        overdueLocal,
        routine.preferredTime,
        TZ,
      );
      await db
        .insert(occurrences)
        .values({
          routineId: routine.id,
          dueAt,
          status: "pending",
        })
        .onConflictDoNothing();
    }

    created += 1;
  }

  const all = await db.query.routines.findMany({
    where: eq(routines.userId, user.id),
  });
  console.log(
    JSON.stringify(
      { email: user.email, created, skipped, total: all.length },
      null,
      2,
    ),
  );
}

await main();
