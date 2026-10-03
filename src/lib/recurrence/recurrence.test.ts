import { describe, expect, it } from "vitest";
import {
  dueAtForLocalDay,
  generateDueDates,
  isLateCompletion,
  isPendingOverdue,
  formatDueLabel,
  hasClockTime,
  resolveMonthDay,
} from "@/lib/recurrence";

describe("recurrence", () => {
  it("generates weekly dues", () => {
    const weekly = generateDueDates(
      {
        rruleKind: "weekly",
        weekday: 0,
        preferredTime: "09:00",
        timezone: "UTC",
        anchorDate: new Date("2026-01-01T00:00:00.000Z"),
      },
      { from: new Date("2026-10-01T12:00:00.000Z"), daysAhead: 14 },
    );
    expect(weekly.length).toBeGreaterThanOrEqual(2);
  });

  it("generates every-n-days dues", () => {
    const everyN = generateDueDates(
      {
        rruleKind: "every_n_days",
        intervalDays: 7,
        preferredTime: "09:00",
        timezone: "UTC",
        anchorDate: new Date("2026-09-24T00:00:00.000Z"),
      },
      { from: new Date("2026-10-01T00:00:00.000Z"), daysAhead: 21 },
    );
    expect(everyN.length).toBeGreaterThanOrEqual(3);
  });

  it("marks next-day completion as late", () => {
    const due = dueAtForLocalDay(
      new Date("2026-10-02T00:00:00.000Z"),
      "09:00",
      "UTC",
    );
    expect(
      isLateCompletion(due, new Date("2026-10-03T10:00:00.000Z"), "UTC"),
    ).toBe(true);
    expect(
      isLateCompletion(due, new Date("2026-10-02T18:00:00.000Z"), "UTC"),
    ).toBe(false);
  });

  it("clamps 31 to the last day of shorter months", () => {
    expect(resolveMonthDay(new Date(2026, 1, 1), 31)).toBe(28);
    expect(resolveMonthDay(new Date(2026, 3, 1), 31)).toBe(30);
    expect(resolveMonthDay(new Date(2026, 0, 1), 31)).toBe(31);
    expect(resolveMonthDay(new Date(2028, 1, 1), 31)).toBe(29);
  });

  it("schedules monthly day 31 on the last valid day", () => {
    const monthly = generateDueDates(
      {
        rruleKind: "monthly",
        monthDay: 31,
        preferredTime: "09:00",
        timezone: "UTC",
        anchorDate: new Date("2026-02-01T00:00:00.000Z"),
      },
      { from: new Date("2026-02-01T00:00:00.000Z"), daysAhead: 100 },
    );
    const days = monthly.map((due) => due.toISOString().slice(0, 10));
    expect(days).toContain("2026-02-28");
    expect(days).toContain("2026-03-31");
    expect(days).toContain("2026-04-30");
  });

  it("treats missing time as the start of the local day", () => {
    const due = dueAtForLocalDay(
      new Date("2026-10-02T00:00:00.000Z"),
      null,
      "UTC",
    );
    expect(due.toISOString()).toBe("2026-10-02T00:00:00.000Z");
    expect(
      isPendingOverdue(due, new Date("2026-10-02T18:00:00.000Z"), "UTC", null),
    ).toBe(false);
    expect(
      isPendingOverdue(due, new Date("2026-10-03T00:00:01.000Z"), "UTC", null),
    ).toBe(true);
  });

  it("omits clock time from labels unless a time is set", () => {
    expect(hasClockTime(null)).toBe(false);
    expect(hasClockTime("09:00")).toBe(true);
    const due = dueAtForLocalDay(
      new Date("2026-10-02T00:00:00.000Z"),
      null,
      "UTC",
    );
    const timed = dueAtForLocalDay(
      new Date("2026-10-02T00:00:00.000Z"),
      "09:00",
      "UTC",
    );
    expect(formatDueLabel(due, "UTC", null)).toBe("Fri, Oct 2");
    expect(formatDueLabel(timed, "UTC", "09:00")).toMatch(/09:00/);
  });
});
