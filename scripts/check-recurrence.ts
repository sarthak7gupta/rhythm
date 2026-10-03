import {
  generateDueDates,
  isLateCompletion,
  dueAtForLocalDay,
} from "../src/lib/recurrence/index";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

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

assert(weekly.length >= 2, "expected at least 2 weekly dues");

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

assert(everyN.length >= 3, "expected rolling every-7-days dues");

const due = dueAtForLocalDay(new Date("2026-10-02T00:00:00.000Z"), "09:00", "UTC");
assert(
  isLateCompletion(due, new Date("2026-10-03T10:00:00.000Z"), "UTC"),
  "next-day completion should be late",
);
assert(
  !isLateCompletion(due, new Date("2026-10-02T18:00:00.000Z"), "UTC"),
  "same-day completion should be on time",
);

console.log("recurrence checks passed");
