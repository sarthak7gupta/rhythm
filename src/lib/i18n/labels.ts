import type { TFunction } from "i18next";
import type { Category, RruleKind } from "@/lib/db/schema";

const categories = ["household", "hygiene", "external", "other"] as const;

export function categoryLabel(category: string, t: TFunction): string {
  if ((categories as readonly string[]).includes(category)) {
    return t(`category.${category as Category}`);
  }
  return t("category.other");
}

export function recurrenceLabel(
  input: {
    rruleKind: RruleKind;
    intervalDays?: number | null;
    weekday?: number | null;
    monthDay?: number | null;
  },
  t: TFunction,
): string {
  if (input.rruleKind === "every_n_days") {
    const n = input.intervalDays ?? 1;
    return n === 1
      ? t("recurrence.everyDay")
      : t("recurrence.everyNDays", { count: n });
  }
  if (input.rruleKind === "weekly") {
    const weekday = String(input.weekday ?? 0);
    return t("recurrence.weeklyOn", { day: t(`weekdayShort.${weekday}`) });
  }
  return t("recurrence.monthlyOn", { day: input.monthDay ?? 1 });
}
