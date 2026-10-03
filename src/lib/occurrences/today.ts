import { and, eq, gte, inArray } from "drizzle-orm";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { db } from "@/lib/db";
import { occurrences, routines } from "@/lib/db/schema";
import { ensureOccurrencesForUser } from "@/lib/occurrences/ensure";
import { effectiveDueAt } from "@/lib/occurrences/snooze";

function localDayBounds(now: Date, timezone: string) {
  const localNow = toZonedTime(now, timezone);
  const startLocal = startOfDay(localNow);
  const endLocal = endOfDay(localNow);
  return {
    startUtc: fromZonedTime(startLocal, timezone),
    endUtc: fromZonedTime(endLocal, timezone),
  };
}

export async function getTodayOccurrences(
  userId: string,
  now: Date = new Date(),
) {
  await ensureOccurrencesForUser(userId);

  const userRoutines = await db.query.routines.findMany({
    where: and(eq(routines.userId, userId), eq(routines.active, true)),
  });

  if (userRoutines.length === 0) {
    return [];
  }

  const routineIds = userRoutines.map((routine) => routine.id);
  const routineById = new Map(
    userRoutines.map((routine) => [routine.id, routine]),
  );

  const lookback = addDays(now, -90);

  const rows = await db.query.occurrences.findMany({
    where: and(
      inArray(occurrences.routineId, routineIds),
      gte(occurrences.dueAt, lookback),
    ),
    orderBy: (table, { asc }) => [asc(table.dueAt)],
  });

  const items = rows
    .map((occurrence) => {
      const routine = routineById.get(occurrence.routineId);
      if (!routine) return null;
      return { occurrence, routine };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .filter(({ occurrence, routine }) => {
      const { startUtc, endUtc } = localDayBounds(now, routine.timezone);
      const due = occurrence.dueAt.getTime();

      if (occurrence.status === "pending") {
        // Overdue or due today (after snooze, use the shifted time)
        return effectiveDueAt(occurrence).getTime() <= endUtc.getTime();
      }

      // Settled items: only show if due today (local)
      return due >= startUtc.getTime() && due <= endUtc.getTime();
    })
    .sort((a, b) => {
      const statusRank = (status: string) =>
        status === "pending" ? 0 : status === "done" ? 1 : 2;
      const rankDiff =
        statusRank(a.occurrence.status) - statusRank(b.occurrence.status);
      if (rankDiff !== 0) return rankDiff;
      return a.occurrence.dueAt.getTime() - b.occurrence.dueAt.getTime();
    });

  return items;
}
