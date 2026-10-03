import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { routines, type Routine } from "@/lib/db/schema";
import { generateDueDates } from "@/lib/recurrence";
import { occurrences } from "@/lib/db/schema";

export async function ensureOccurrencesForRoutine(
  routine: Routine,
  options: { daysAhead?: number } = {},
): Promise<number> {
  if (!routine.active) {
    return 0;
  }

  const dueDates = generateDueDates(
    {
      rruleKind: routine.rruleKind,
      intervalDays: routine.intervalDays,
      weekday: routine.weekday,
      monthDay: routine.monthDay,
      preferredTime: routine.preferredTime,
      timezone: routine.timezone,
      anchorDate: routine.anchorDate,
    },
    { daysAhead: options.daysAhead ?? 30 },
  );

  if (dueDates.length === 0) {
    return 0;
  }

  const values = dueDates.map((dueAt) => ({
    routineId: routine.id,
    dueAt,
    status: "pending" as const,
  }));

  const inserted = await db
    .insert(occurrences)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: occurrences.id });

  return inserted.length;
}

export async function ensureOccurrencesForUser(
  userId: string,
  options: { daysAhead?: number } = {},
): Promise<number> {
  const activeRoutines = await db.query.routines.findMany({
    where: and(eq(routines.userId, userId), eq(routines.active, true)),
  });

  let created = 0;
  for (const routine of activeRoutines) {
    created += await ensureOccurrencesForRoutine(routine, options);
  }
  return created;
}

export async function ensureOccurrencesForAllActive(
  options: { daysAhead?: number } = {},
): Promise<number> {
  const activeRoutines = await db.query.routines.findMany({
    where: eq(routines.active, true),
  });

  let created = 0;
  for (const routine of activeRoutines) {
    created += await ensureOccurrencesForRoutine(routine, options);
  }
  return created;
}
