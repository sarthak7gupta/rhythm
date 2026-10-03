import { describe, expect, it } from "vitest";
import {
  remainingStarters,
  starterIds,
  starterPack,
  starterPayload,
} from "@/lib/starters";
import { routineInputSchema } from "@/lib/validators/routine";

describe("starterPack", () => {
  it("covers the five getting-started examples", () => {
    expect(starterPack.map((item) => item.id)).toEqual([...starterIds]);
  });

  it("hides starters whose title already exists, even loosely", () => {
    const remaining = remainingStarters({
      existingTitles: [
        "Change bed sheets",
        "Take bins out",
        "Water filter",
      ],
      starterTitle: (id) => {
        const titles = {
          bedsheets: "Change bed sheets",
          nails: "Trim nails",
          haircut: "Haircut",
          bins: "Take the bins out",
          waterFilter: "Replace water filter",
        };
        return titles[id];
      },
    });
    expect(remaining.map((item) => item.id)).toEqual(["nails", "haircut"]);
  });

  it("builds payloads the routines API accepts", () => {
    for (const template of starterPack) {
      const parsed = routineInputSchema.safeParse(
        starterPayload(template, {
          title: template.id,
          notes: "note",
          timezone: "UTC",
        }),
      );
      expect(parsed.success).toBe(true);
    }
  });

  it("applies weekday, month day, and start date overrides", () => {
    const weekly = starterPayload(starterPack[3]!, {
      title: "bins",
      notes: "note",
      timezone: "UTC",
      weekday: 3,
    });
    expect(weekly.weekday).toBe(3);

    const monthly = starterPayload(starterPack[4]!, {
      title: "waterFilter",
      notes: "note",
      timezone: "UTC",
      monthDay: 31,
    });
    expect(monthly.monthDay).toBe(31);
    expect(routineInputSchema.safeParse(monthly).success).toBe(true);

    const everyN = starterPayload(starterPack[0]!, {
      title: "bedsheets",
      notes: "note",
      timezone: "UTC",
      anchorDate: "2026-10-10T12:00:00",
    });
    expect(everyN.anchorDate).toBe("2026-10-10T12:00:00");
  });

  it("overrides frequency kind", () => {
    const weekly = starterPayload(starterPack[0]!, {
      title: "bedsheets",
      notes: "note",
      timezone: "UTC",
      rruleKind: "weekly",
      weekday: 2,
    });
    expect(weekly.rruleKind).toBe("weekly");
    expect(weekly.intervalDays).toBeNull();
    expect(weekly.weekday).toBe(2);
    expect(weekly.monthDay).toBeNull();
    expect(routineInputSchema.safeParse(weekly).success).toBe(true);
  });

  it("omits time unless an override is passed", () => {
    const payload = starterPayload(starterPack[0]!, {
      title: "bedsheets",
      notes: "note",
      timezone: "UTC",
    });
    expect(payload.preferredTime).toBeNull();
    expect(routineInputSchema.safeParse(payload).success).toBe(true);

    const timed = starterPayload(starterPack[0]!, {
      title: "bedsheets",
      notes: "note",
      timezone: "UTC",
      preferredTime: "07:30",
    });
    expect(timed.preferredTime).toBe("07:30");
  });
});
