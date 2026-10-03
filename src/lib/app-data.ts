import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { occurrences, routines, users } from "@/lib/db/schema";
import { getTodayOccurrences } from "@/lib/occurrences/today";
import { effectiveDueAt } from "@/lib/occurrences/snooze";
import { isLateCompletion, isPendingOverdue } from "@/lib/recurrence";
import { computeRegularityStats } from "@/lib/stats";
import type { TodayItem } from "@/components/TodayList";

export function serializeTodayItems(
  rows: Awaited<ReturnType<typeof getTodayOccurrences>>,
  now: Date,
): TodayItem[] {
  return rows.map(({ occurrence, routine }) => ({
    occurrence: {
      id: occurrence.id,
      dueAt: occurrence.dueAt.toISOString(),
      snoozedUntil: occurrence.snoozedUntil?.toISOString() ?? null,
      status: occurrence.status,
      completedAt: occurrence.completedAt?.toISOString() ?? null,
    },
    routine: {
      id: routine.id,
      title: routine.title,
      notes: routine.notes,
      category: routine.category,
      timezone: routine.timezone,
      rruleKind: routine.rruleKind,
      intervalDays: routine.intervalDays,
      weekday: routine.weekday,
      monthDay: routine.monthDay,
      preferredTime: routine.preferredTime,
    },
    overdue:
      occurrence.status === "pending" &&
      isPendingOverdue(
        effectiveDueAt(occurrence),
        now,
        routine.timezone,
        routine.preferredTime,
      ),
    late:
      occurrence.status === "done" &&
      occurrence.completedAt != null &&
      isLateCompletion(
        effectiveDueAt(occurrence),
        occurrence.completedAt,
        routine.timezone,
      ),
  }));
}

export async function loadTodayPage(userId: string) {
  const now = new Date();
  const db = getDb();
  const rows = await getTodayOccurrences(userId, now);
  const items = serializeTodayItems(rows, now);
  const existingRoutines = await db.query.routines.findMany({
    where: eq(routines.userId, userId),
    columns: { id: true, title: true },
  });
  return {
    nowIso: now.toISOString(),
    items,
    existingRoutines,
  };
}

export async function loadRoutinesPage(userId: string) {
  const db = getDb();
  return db.query.routines.findMany({
    where: eq(routines.userId, userId),
    orderBy: (table, { desc }) => [desc(table.active), desc(table.updatedAt)],
  });
}

export async function loadRoutineDetail(userId: string, id: string) {
  const routineId = Number(id);
  if (!Number.isFinite(routineId)) return null;

  const db = getDb();
  const routine = await db.query.routines.findFirst({
    where: (table, { and, eq: equals }) =>
      and(equals(table.id, routineId), equals(table.userId, userId)),
  });
  if (!routine) return null;

  const history = await db.query.occurrences.findMany({
    where: eq(occurrences.routineId, routine.id),
    orderBy: (table, { desc }) => [desc(table.dueAt)],
    limit: 40,
  });

  const stats = computeRegularityStats(history, routine.timezone);

  return {
    routine,
    history: history.map((occurrence) => ({
      ...occurrence,
      dueAt: occurrence.dueAt.toISOString(),
      snoozedUntil: occurrence.snoozedUntil?.toISOString() ?? null,
      completedAt: occurrence.completedAt?.toISOString() ?? null,
      lastNotifiedAt: occurrence.lastNotifiedAt?.toISOString() ?? null,
      createdAt: occurrence.createdAt.toISOString(),
    })),
    stats,
  };
}

export async function loadSettingsPage(userId: string, email: string | null) {
  const db = getDb();
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  return {
    email,
    timezone: row?.timezone ?? "Asia/Kolkata",
  };
}
