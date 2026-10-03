import { addDays, addHours, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { dueAtForLocalDay } from "@/lib/recurrence";

export const snoozeKinds = ["later_today", "tomorrow", "plus_2_days"] as const;

export type SnoozeKind = (typeof snoozeKinds)[number];

export function effectiveDueAt(occurrence: {
  dueAt: Date;
  snoozedUntil: Date | null;
}): Date {
  return occurrence.snoozedUntil ?? occurrence.dueAt;
}

/** Shift a pending occurrence without changing the original `dueAt` slot. */
export function snoozeUntil(input: {
  now: Date;
  dueAt: Date;
  snoozedUntil: Date | null;
  preferredTime: string | null;
  timezone: string;
  kind: SnoozeKind;
}): Date {
  const { now, preferredTime, timezone, kind } = input;
  const localNow = toZonedTime(now, timezone);
  const todayLocal = startOfDay(localNow);

  if (kind === "tomorrow") {
    return dueAtForLocalDay(addDays(todayLocal, 1), preferredTime, timezone);
  }
  if (kind === "plus_2_days") {
    return dueAtForLocalDay(addDays(todayLocal, 2), preferredTime, timezone);
  }

  const current = effectiveDueAt(input);
  const base = current.getTime() > now.getTime() ? current : now;
  const later = addHours(base, 3);
  const laterLocal = toZonedTime(later, timezone);
  if (startOfDay(laterLocal).getTime() !== todayLocal.getTime()) {
    return dueAtForLocalDay(addDays(todayLocal, 1), preferredTime, timezone);
  }
  return later;
}
