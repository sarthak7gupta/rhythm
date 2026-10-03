import { describe, expect, it } from "vitest";
import { snoozeUntil } from "@/lib/occurrences/snooze";

describe("snoozeUntil", () => {
  const preferredTime = "09:00";
  const timezone = "UTC";
  const dueAt = new Date("2026-10-03T09:00:00.000Z");

  it("pushes later today by three hours from now when overdue", () => {
    const target = snoozeUntil({
      now: new Date("2026-10-03T10:00:00.000Z"),
      dueAt,
      snoozedUntil: null,
      preferredTime,
      timezone,
      kind: "later_today",
    });
    expect(target.toISOString()).toBe("2026-10-03T13:00:00.000Z");
  });

  it("rolls later today past midnight to tomorrow morning", () => {
    const target = snoozeUntil({
      now: new Date("2026-10-03T22:00:00.000Z"),
      dueAt,
      snoozedUntil: null,
      preferredTime,
      timezone,
      kind: "later_today",
    });
    expect(target.toISOString()).toBe("2026-10-04T09:00:00.000Z");
  });

  it("moves to tomorrow at the preferred time", () => {
    const target = snoozeUntil({
      now: new Date("2026-10-03T10:00:00.000Z"),
      dueAt,
      snoozedUntil: null,
      preferredTime,
      timezone,
      kind: "tomorrow",
    });
    expect(target.toISOString()).toBe("2026-10-04T09:00:00.000Z");
  });

  it("moves two local days ahead", () => {
    const target = snoozeUntil({
      now: new Date("2026-10-03T10:00:00.000Z"),
      dueAt,
      snoozedUntil: null,
      preferredTime,
      timezone,
      kind: "plus_2_days",
    });
    expect(target.toISOString()).toBe("2026-10-05T09:00:00.000Z");
  });
});
