import { describe, expect, it } from "vitest";
import { i18n } from "@/lib/i18n";
import { categoryLabel, recurrenceLabel } from "@/lib/i18n/labels";

describe("i18n", () => {
  it("translates English category labels", async () => {
    await i18n.changeLanguage("en");
    expect(categoryLabel("household", i18n.t)).toBe("Household");
  });

  it("translates French recurrence labels", async () => {
    await i18n.changeLanguage("fr");
    expect(
      recurrenceLabel({ rruleKind: "every_n_days", intervalDays: 7 }, i18n.t),
    ).toBe("Tous les 7 jours");
  });
});
