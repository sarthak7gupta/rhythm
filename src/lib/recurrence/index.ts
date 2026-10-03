import {
  addDays,
  addMonths,
  endOfDay,
  format,
  getDate,
  getDay,
  getDaysInMonth,
  isBefore,
  isEqual,
  setHours,
  setMinutes,
  setSeconds,
  startOfDay,
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import type { RruleKind } from "@/lib/db/schema";

export type RecurrenceInput = {
  rruleKind: RruleKind;
  intervalDays?: number | null;
  weekday?: number | null;
  monthDay?: number | null;
  /** `HH:mm` in the routine timezone, or `null` for day-only dues. */
  preferredTime: string | null;
  timezone: string;
  anchorDate: Date;
};

const CLOCK_TIME = /^(\d{2}):(\d{2})$/;

export function hasClockTime(
  preferredTime: string | null | undefined,
): preferredTime is string {
  return typeof preferredTime === "string" && CLOCK_TIME.test(preferredTime);
}

function parsePreferredTime(preferredTime: string | null | undefined): {
  hours: number;
  minutes: number;
} {
  if (!hasClockTime(preferredTime)) {
    return { hours: 0, minutes: 0 };
  }
  const match = CLOCK_TIME.exec(preferredTime);
  const hours = Number(match?.[1]);
  const minutes = Number(match?.[2]);
  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

/** Build a UTC Date for a calendar day + optional preferred time in the given timezone. */
export function dueAtForLocalDay(
  localDay: Date,
  preferredTime: string | null | undefined,
  timezone: string,
): Date {
  const { hours, minutes } = parsePreferredTime(preferredTime);
  const local = setSeconds(
    setMinutes(setHours(startOfDay(localDay), hours), minutes),
    0,
  );
  return fromZonedTime(local, timezone);
}

export function endOfDueDayUtc(dueAt: Date, timezone: string): Date {
  const local = toZonedTime(dueAt, timezone);
  return fromZonedTime(endOfDay(local), timezone);
}

export function isLateCompletion(
  dueAt: Date,
  completedAt: Date,
  timezone: string,
): boolean {
  return completedAt.getTime() > endOfDueDayUtc(dueAt, timezone).getTime();
}

function localCalendarDay(date: Date, timezone: string): Date {
  return startOfDay(toZonedTime(date, timezone));
}

function nextWeeklyLocalDay(
  fromLocalDay: Date,
  weekday: number,
  inclusive: boolean,
): Date {
  let cursor = fromLocalDay;
  for (let i = 0; i < 8; i += 1) {
    if (getDay(cursor) === weekday) {
      if (inclusive || !isEqual(cursor, fromLocalDay)) {
        return cursor;
      }
    }
    cursor = addDays(cursor, 1);
  }
  return addDays(fromLocalDay, 7);
}

export function resolveMonthDay(localMonth: Date, monthDay: number): number {
  const wanted = Math.min(Math.max(Math.trunc(monthDay) || 1, 1), 31);
  return Math.min(wanted, getDaysInMonth(localMonth));
}

function nextMonthlyLocalDay(
  fromLocalDay: Date,
  monthDay: number,
  inclusive: boolean,
): Date {
  let year = fromLocalDay.getFullYear();
  let month = fromLocalDay.getMonth();

  for (let i = 0; i < 14; i += 1) {
    const monthStart = startOfDay(new Date(year, month, 1));
    const day = resolveMonthDay(monthStart, monthDay);
    const candidate = startOfDay(new Date(year, month, day));
    if (
      (inclusive && !isBefore(candidate, fromLocalDay)) ||
      (!inclusive && isBefore(fromLocalDay, candidate))
    ) {
      return candidate;
    }
    const next = addMonths(monthStart, 1);
    year = next.getFullYear();
    month = next.getMonth();
  }

  const fallback = startOfDay(new Date(year, month, 1));
  return startOfDay(new Date(year, month, resolveMonthDay(fallback, monthDay)));
}

/**
 * Generate upcoming due timestamps (UTC) from anchor through `daysAhead` local days.
 */
export function generateDueDates(
  input: RecurrenceInput,
  options: { from?: Date; daysAhead?: number } = {},
): Date[] {
  const from = options.from ?? new Date();
  const daysAhead = options.daysAhead ?? 30;
  const timezone = input.timezone;
  const fromLocal = localCalendarDay(from, timezone);
  const horizonLocal = addDays(fromLocal, daysAhead);
  const anchorLocal = localCalendarDay(input.anchorDate, timezone);
  const results: Date[] = [];

  if (input.rruleKind === "every_n_days") {
    const interval = Math.max(1, input.intervalDays ?? 1);
    let cursor = anchorLocal;
    // Fast-forward to near the window
    while (isBefore(addDays(cursor, interval), fromLocal)) {
      cursor = addDays(cursor, interval);
    }
    if (isBefore(cursor, fromLocal) && !isEqual(cursor, fromLocal)) {
      cursor = addDays(cursor, interval);
    }
    while (!isBefore(horizonLocal, cursor)) {
      if (!isBefore(cursor, fromLocal)) {
        results.push(dueAtForLocalDay(cursor, input.preferredTime, timezone));
      }
      cursor = addDays(cursor, interval);
    }
    return results;
  }

  if (input.rruleKind === "weekly") {
    const weekday = input.weekday ?? 0;
    let cursor = nextWeeklyLocalDay(fromLocal, weekday, true);
    while (!isBefore(horizonLocal, cursor)) {
      results.push(dueAtForLocalDay(cursor, input.preferredTime, timezone));
      cursor = addDays(cursor, 7);
    }
    return results;
  }

  // monthly
  const monthDay = input.monthDay ?? getDate(anchorLocal);
  let cursor = nextMonthlyLocalDay(fromLocal, monthDay, true);
  while (!isBefore(horizonLocal, cursor)) {
    results.push(dueAtForLocalDay(cursor, input.preferredTime, timezone));
    cursor = nextMonthlyLocalDay(addDays(cursor, 1), monthDay, true);
  }
  return results;
}

export function isPendingOverdue(
  dueAt: Date,
  now: Date,
  timezone: string,
  preferredTime: string | null | undefined,
): boolean {
  if (hasClockTime(preferredTime)) {
    return dueAt.getTime() < now.getTime();
  }
  return now.getTime() > endOfDueDayUtc(dueAt, timezone).getTime();
}

export function formatDueLabel(
  dueAt: Date,
  timezone: string,
  preferredTime?: string | null,
): string {
  const local = toZonedTime(dueAt, timezone);
  const showTime =
    hasClockTime(preferredTime) ||
    local.getHours() !== 0 ||
    local.getMinutes() !== 0;
  return format(local, showTime ? "EEE, MMM d · HH:mm" : "EEE, MMM d");
}
