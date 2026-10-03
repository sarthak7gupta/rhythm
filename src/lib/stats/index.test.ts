import { describe, expect, it } from "vitest";
import type { Occurrence } from "@/lib/db/schema";
import { computeRegularityStats } from "@/lib/stats";

function occurrence(
  overrides: Partial<Occurrence> & Pick<Occurrence, "dueAt" | "status">,
): Occurrence {
  return {
    id: 1,
    routineId: 1,
    snoozedUntil: null,
    completedAt: null,
    lastNotifiedAt: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("computeRegularityStats", () => {
  it("treats an empty history as zero rates", () => {
    const stats = computeRegularityStats([], "UTC", new Date("2026-10-03Z"));
    expect(stats.totalDue).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.onTimeStreak).toBe(0);
  });

  it("counts an on-time completion", () => {
    const stats = computeRegularityStats(
      [
        occurrence({
          dueAt: new Date("2026-10-02T09:00:00.000Z"),
          status: "done",
          completedAt: new Date("2026-10-02T10:00:00.000Z"),
        }),
      ],
      "UTC",
      new Date("2026-10-03T00:00:00.000Z"),
    );
    expect(stats.completed).toBe(1);
    expect(stats.onTimeRate).toBe(1);
    expect(stats.onTimeStreak).toBe(1);
  });
});
