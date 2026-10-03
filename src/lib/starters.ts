import type { Category, RruleKind } from "@/lib/db/schema";
import type { RoutineInput } from "@/lib/validators/routine";

export const starterIds = [
  "bedsheets",
  "nails",
  "haircut",
  "bins",
  "waterFilter",
] as const;

export type StarterId = (typeof starterIds)[number];

export type StarterTemplate = {
  id: StarterId;
  category: Category;
  rruleKind: RruleKind;
  intervalDays: number | null;
  weekday: number | null;
  monthDay: number | null;
  preferredTime: string | null;
};

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleWords(title: string): string[] {
  const stop = new Set([
    "the",
    "a",
    "an",
    "le",
    "la",
    "les",
    "el",
    "los",
    "der",
    "die",
    "das",
    "un",
    "une",
  ]);
  return normalizeTitle(title)
    .split(" ")
    .filter((word) => word.length > 1 && !stop.has(word));
}

/** True when an existing routine is the same starter (titles need not match exactly). */
export function starterTitleMatchesExisting(input: {
  starterTitle: string;
  existingTitles: string[];
}): boolean {
  const starterWords = titleWords(input.starterTitle);
  if (starterWords.length === 0) return false;
  const starterNorm = starterWords.join(" ");
  return input.existingTitles.some((existing) => {
    const existingNorm = normalizeTitle(existing);
    if (existingNorm === normalizeTitle(input.starterTitle)) return true;
    const existingWords = titleWords(existing);
    if (existingWords.length === 0) return false;
    const existingJoined = existingWords.join(" ");
    if (existingJoined.includes(starterNorm) || starterNorm.includes(existingJoined)) {
      return true;
    }
    return starterWords.every((word) => existingWords.includes(word));
  });
}

export function remainingStarters(input: {
  existingTitles: string[];
  starterTitle: (id: StarterId) => string;
}): StarterTemplate[] {
  return starterPack.filter(
    (item) =>
      !starterTitleMatchesExisting({
        starterTitle: input.starterTitle(item.id),
        existingTitles: input.existingTitles,
      }),
  );
}

export const starterPack: StarterTemplate[] = [
  {
    id: "bedsheets",
    category: "household",
    rruleKind: "every_n_days",
    intervalDays: 7,
    weekday: null,
    monthDay: null,
    preferredTime: null,
  },
  {
    id: "nails",
    category: "hygiene",
    rruleKind: "every_n_days",
    intervalDays: 14,
    weekday: null,
    monthDay: null,
    preferredTime: null,
  },
  {
    id: "haircut",
    category: "hygiene",
    rruleKind: "every_n_days",
    intervalDays: 35,
    weekday: null,
    monthDay: null,
    preferredTime: null,
  },
  {
    id: "bins",
    category: "household",
    rruleKind: "weekly",
    intervalDays: null,
    weekday: 0,
    monthDay: null,
    preferredTime: null,
  },
  {
    id: "waterFilter",
    category: "household",
    rruleKind: "monthly",
    intervalDays: null,
    weekday: null,
    monthDay: 1,
    preferredTime: null,
  },
];

/** Payload accepted by `POST /api/routines`. */
export function starterPayload(
  template: StarterTemplate,
  input: {
    title: string;
    notes: string;
    timezone: string;
    rruleKind?: RruleKind;
    intervalDays?: number | null;
    weekday?: number | null;
    monthDay?: number | null;
    preferredTime?: string | null;
    anchorDate?: string;
  },
): RoutineInput {
  const rruleKind = input.rruleKind ?? template.rruleKind;
  return {
    title: input.title,
    notes: input.notes,
    category: template.category,
    rruleKind,
    intervalDays:
      rruleKind === "every_n_days"
        ? (input.intervalDays ?? template.intervalDays ?? 7)
        : null,
    weekday:
      rruleKind === "weekly" ? (input.weekday ?? template.weekday ?? 0) : null,
    monthDay:
      rruleKind === "monthly"
        ? (input.monthDay ?? template.monthDay ?? 1)
        : null,
    preferredTime: input.preferredTime ?? template.preferredTime,
    timezone: input.timezone,
    active: true,
    anchorDate: rruleKind === "every_n_days" ? input.anchorDate : undefined,
  };
}
