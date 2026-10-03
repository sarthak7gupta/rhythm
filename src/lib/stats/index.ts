import { differenceInCalendarDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { isLateCompletion } from "@/lib/recurrence";
import type { Occurrence } from "@/lib/db/schema";

export type RegularityStats = {
  totalDue: number;
  completed: number;
  skipped: number;
  pending: number;
  completionRate: number;
  onTimeRate: number;
  lateCount: number;
  averageDaysLate: number | null;
  onTimeStreak: number;
};

/**
 * Completion / lateness stats for a routine’s occurrence history.
 * Pending items still in the future are ignored.
 */
export function computeRegularityStats(
  occurrences: Occurrence[],
  timezone: string,
  now: Date = new Date(),
): RegularityStats {
  const dueOrSettled = occurrences.filter(
    (occurrence) =>
      occurrence.status !== "pending" ||
      occurrence.dueAt.getTime() <= now.getTime(),
  );

  const completed = dueOrSettled.filter((o) => o.status === "done");
  const skipped = dueOrSettled.filter((o) => o.status === "skipped");
  const pending = dueOrSettled.filter((o) => o.status === "pending");
  const settled = completed.length + skipped.length + pending.length;

  const lateOnes = completed.filter(
    (o) =>
      o.completedAt != null &&
      isLateCompletion(o.dueAt, o.completedAt, timezone),
  );

  const lateDays = lateOnes.map((o) => {
    const dueLocal = toZonedTime(o.dueAt, timezone);
    const doneLocal = toZonedTime(o.completedAt!, timezone);
    return Math.max(0, differenceInCalendarDays(doneLocal, dueLocal));
  });

  const averageDaysLate =
    lateDays.length > 0
      ? lateDays.reduce((sum, days) => sum + days, 0) / lateDays.length
      : null;

  // Streak: walk newest completed first, count consecutive on-time dones
  const completedNewestFirst = [...completed].sort(
    (a, b) => b.dueAt.getTime() - a.dueAt.getTime(),
  );
  let onTimeStreak = 0;
  for (const occurrence of completedNewestFirst) {
    if (
      occurrence.completedAt &&
      !isLateCompletion(occurrence.dueAt, occurrence.completedAt, timezone)
    ) {
      onTimeStreak += 1;
    } else {
      break;
    }
  }

  return {
    totalDue: settled,
    completed: completed.length,
    skipped: skipped.length,
    pending: pending.length,
    completionRate: settled === 0 ? 0 : completed.length / settled,
    onTimeRate:
      completed.length === 0
        ? 0
        : (completed.length - lateOnes.length) / completed.length,
    lateCount: lateOnes.length,
    averageDaysLate,
    onTimeStreak,
  };
}
