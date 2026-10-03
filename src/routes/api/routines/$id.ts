import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { occurrences, routines } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { routineInputSchema } from "@/lib/validators/routine";
import { ensureOccurrencesForRoutine } from "@/lib/occurrences/ensure";
import { computeRegularityStats } from "@/lib/stats";
import { LIMITS } from "@/lib/security/limits";
import { guardApiRead, guardApiWrite, limitRequest } from "@/lib/security/rate-limit";

async function getOwnedRoutine(userId: string, id: string) {
  const routineId = Number(id);
  if (!Number.isFinite(routineId)) return null;

  const routine = await db.query.routines.findFirst({
    where: and(eq(routines.id, routineId), eq(routines.userId, userId)),
  });
  return routine ?? null;
}

export const Route = createFileRoute("/api/routines/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const denied = await guardApiRead(request);
        if (denied) return denied;

        const user = await requireUser(request);
        if (!user?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const routine = await getOwnedRoutine(user.id, params.id);
        if (!routine) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }

        const history = await db.query.occurrences.findMany({
          where: eq(occurrences.routineId, routine.id),
          orderBy: (table, { desc }) => [desc(table.dueAt)],
          limit: 100,
        });

        const stats = computeRegularityStats(history, routine.timezone);
        return Response.json({ routine, occurrences: history, stats });
      },
      PATCH: async ({ request, params }) => {
        const writeDenied = await guardApiWrite(request);
        if (writeDenied) return writeDenied;

        const user = await requireUser(request);
        if (!user?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userDenied = await limitRequest(request, {
          strict: true,
          buckets: [
            {
              name: "api-write-user",
              limit: LIMITS.apiWrite.limit,
              windowMs: LIMITS.apiWrite.windowMs,
              id: user.id,
            },
          ],
        });
        if (userDenied) return userDenied;

        const routine = await getOwnedRoutine(user.id, params.id);
        if (!routine) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }

        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
          return Response.json({ error: "Invalid input" }, { status: 400 });
        }

        const hasFullShape =
          "title" in body || "rruleKind" in body || "category" in body;
        if (hasFullShape) {
          const parsed = routineInputSchema.safeParse({
            title: body.title ?? routine.title,
            notes: body.notes === undefined ? routine.notes : body.notes,
            category: body.category ?? routine.category,
            rruleKind: body.rruleKind ?? routine.rruleKind,
            intervalDays:
              body.intervalDays === undefined
                ? routine.intervalDays
                : body.intervalDays,
            weekday:
              body.weekday === undefined ? routine.weekday : body.weekday,
            monthDay:
              body.monthDay === undefined ? routine.monthDay : body.monthDay,
            preferredTime:
              body.preferredTime === undefined
                ? routine.preferredTime
                : body.preferredTime,
            timezone: body.timezone ?? routine.timezone,
            active: body.active ?? routine.active,
            anchorDate: body.anchorDate,
          });
          if (!parsed.success) {
            return Response.json(
              { error: "Invalid input", details: parsed.error.flatten() },
              { status: 400 },
            );
          }
          body.title = parsed.data.title;
          body.notes = parsed.data.notes;
          body.category = parsed.data.category;
          body.rruleKind = parsed.data.rruleKind;
          body.intervalDays = parsed.data.intervalDays;
          body.weekday = parsed.data.weekday;
          body.monthDay = parsed.data.monthDay;
          body.preferredTime = parsed.data.preferredTime;
          body.timezone = parsed.data.timezone;
          body.active = parsed.data.active;
          body.anchorDate = parsed.data.anchorDate;
        }

        const data = body as Partial<{
          title: string;
          notes: string | null;
          category: typeof routine.category;
          rruleKind: typeof routine.rruleKind;
          intervalDays: number | null;
          weekday: number | null;
          monthDay: number | null;
          preferredTime: string | null;
          timezone: string;
          active: boolean;
          anchorDate: string;
        }>;
        const rruleKind = data.rruleKind ?? routine.rruleKind;

        const [updated] = await db
          .update(routines)
          .set({
            title: data.title ?? routine.title,
            notes: data.notes === undefined ? routine.notes : data.notes,
            category: data.category ?? routine.category,
            rruleKind,
            intervalDays:
              rruleKind === "every_n_days"
                ? (data.intervalDays ?? routine.intervalDays)
                : null,
            weekday:
              rruleKind === "weekly" ? (data.weekday ?? routine.weekday) : null,
            monthDay:
              rruleKind === "monthly"
                ? (data.monthDay ?? routine.monthDay)
                : null,
            preferredTime:
              data.preferredTime === undefined
                ? routine.preferredTime
                : data.preferredTime,
            timezone: data.timezone ?? routine.timezone,
            active: data.active ?? routine.active,
            anchorDate: data.anchorDate
              ? new Date(data.anchorDate)
              : routine.anchorDate,
            updatedAt: new Date(),
          })
          .where(eq(routines.id, routine.id))
          .returning();

        await ensureOccurrencesForRoutine(updated);
        return Response.json({ routine: updated });
      },
      DELETE: async ({ request, params }) => {
        const writeDenied = await guardApiWrite(request);
        if (writeDenied) return writeDenied;

        const user = await requireUser(request);
        if (!user?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const routine = await getOwnedRoutine(user.id, params.id);
        if (!routine) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }

        await db.delete(routines).where(eq(routines.id, routine.id));
        return Response.json({ ok: true });
      },
    },
  },
});
