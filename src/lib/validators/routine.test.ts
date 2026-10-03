import { describe, expect, it } from "vitest";
import { routineInputSchema } from "@/lib/validators/routine";

describe("routineInputSchema", () => {
  it("defaults missing time to null", () => {
    const parsed = routineInputSchema.parse({
      title: "Sheets",
      rruleKind: "every_n_days",
      intervalDays: 7,
    });
    expect(parsed.preferredTime).toBeNull();
  });

  it("accepts an explicit clock time", () => {
    const parsed = routineInputSchema.parse({
      title: "Sheets",
      rruleKind: "weekly",
      weekday: 0,
      preferredTime: "07:30",
    });
    expect(parsed.preferredTime).toBe("07:30");
  });

  it("rejects monthly routines without a day of month", () => {
    const parsed = routineInputSchema.safeParse({
      title: "Filter",
      rruleKind: "monthly",
    });
    expect(parsed.success).toBe(false);
  });
});
