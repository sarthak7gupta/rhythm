import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { occurrences } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { ensureOccurrencesForRoutine } from "@/lib/occurrences/ensure";
import { snoozeKinds, snoozeUntil } from "@/lib/occurrences/snooze";
import { isLateCompletion } from "@/lib/recurrence";
import { guardApiWrite } from "@/lib/security/rate-limit";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("skip") }),
  z.object({ action: z.literal("undo") }),
  z.object({
    action: z.literal("snooze"),
    kind: z.enum(snoozeKinds),
  }),
]);

export const Route = createFileRoute("/api/occurrences/$id")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const writeDenied = await guardApiWrite(request);
        if (writeDenied) return writeDenied;

        const user = await requireUser(request);
        if (!user?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const occurrenceId = Number(params.id);
        if (!Number.isFinite(occurrenceId)) {
          return Response.json({ error: "Invalid id" }, { status: 400 });
        }

        const body = await request.json().catch(() => null);
        const parsed = actionSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Invalid input" }, { status: 400 });
        }

        const occurrence = await db.query.occurrences.findFirst({
          where: eq(occurrences.id, occurrenceId),
          with: { routine: true },
        });

        if (!occurrence || occurrence.routine.userId !== user.id) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }

        const now = new Date();
        let status: "pending" | "done" | "skipped" = occurrence.status;
        let completedAt: Date | null = occurrence.completedAt;
        let snoozedUntil: Date | null = occurrence.snoozedUntil;

        if (parsed.data.action === "complete") {
          status = "done";
          completedAt = now;
          snoozedUntil = null;
        } else if (parsed.data.action === "skip") {
          status = "skipped";
          completedAt = null;
          snoozedUntil = null;
        } else if (parsed.data.action === "snooze") {
          if (occurrence.status !== "pending") {
            return Response.json(
              { error: "Only pending reminders can be snoozed" },
              { status: 400 },
            );
          }
          status = "pending";
          completedAt = null;
          snoozedUntil = snoozeUntil({
            now,
            dueAt: occurrence.dueAt,
            snoozedUntil: occurrence.snoozedUntil,
            preferredTime: occurrence.routine.preferredTime,
            timezone: occurrence.routine.timezone,
            kind: parsed.data.kind,
          });
        } else {
          status = "pending";
          completedAt = null;
          snoozedUntil = null;
        }

        const [updated] = await db
          .update(occurrences)
          .set({ status, completedAt, snoozedUntil })
          .where(
            and(
              eq(occurrences.id, occurrenceId),
              eq(occurrences.routineId, occurrence.routineId),
            ),
          )
          .returning();

        if (parsed.data.action !== "snooze") {
          await ensureOccurrencesForRoutine(occurrence.routine);
        }

        const late =
          updated.status === "done" &&
          updated.completedAt != null &&
          isLateCompletion(
            updated.snoozedUntil ?? updated.dueAt,
            updated.completedAt,
            occurrence.routine.timezone,
          );

        return Response.json({
          occurrence: updated,
          late,
          routineId: occurrence.routineId,
        });
      },
    },
  },
});
