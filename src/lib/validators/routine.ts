import { z } from "zod";

export const categorySchema = z.enum([
  "household",
  "hygiene",
  "external",
  "other",
]);

export const rruleKindSchema = z.enum(["every_n_days", "weekly", "monthly"]);

export const routineInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    notes: z.string().trim().max(2000).optional().nullable(),
    category: categorySchema.default("other"),
    rruleKind: rruleKindSchema,
    intervalDays: z.number().int().min(1).max(365).optional().nullable(),
    weekday: z.number().int().min(0).max(6).optional().nullable(),
    monthDay: z.number().int().min(1).max(31).optional().nullable(),
    preferredTime: z
      .union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/), z.null()])
      .optional()
      .transform((value): string | null =>
        value === "" || value == null ? null : value,
      ),
    timezone: z.string().min(1).max(64).default("Asia/Kolkata"),
    active: z.boolean().optional(),
    anchorDate: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.rruleKind === "every_n_days" && !value.intervalDays) {
      ctx.addIssue({
        code: "custom",
        message: "intervalDays is required for every_n_days",
        path: ["intervalDays"],
      });
    }
    if (value.rruleKind === "weekly" && value.weekday == null) {
      ctx.addIssue({
        code: "custom",
        message: "weekday is required for weekly",
        path: ["weekday"],
      });
    }
    if (value.rruleKind === "monthly" && value.monthDay == null) {
      ctx.addIssue({
        code: "custom",
        message: "monthDay is required for monthly",
        path: ["monthDay"],
      });
    }
  });

export type RoutineInput = z.infer<typeof routineInputSchema>;
