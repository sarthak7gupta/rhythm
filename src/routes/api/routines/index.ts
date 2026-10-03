import { createFileRoute } from "@tanstack/react-router";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { routines } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { routineInputSchema } from "@/lib/validators/routine";
import { ensureOccurrencesForRoutine } from "@/lib/occurrences/ensure";
import { LIMITS } from "@/lib/security/limits";
import { guardApiRead, guardApiWrite, limitRequest } from "@/lib/security/rate-limit";

export const Route = createFileRoute("/api/routines/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await guardApiRead(request);
        if (denied) return denied;

        const user = await requireUser(request);
        if (!user?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rows = await db.query.routines.findMany({
          where: eq(routines.userId, user.id),
          orderBy: [desc(routines.updatedAt)],
        });

        return Response.json({ routines: rows });
      },
      POST: async ({ request }) => {
        const ipDenied = await guardApiWrite(request);
        if (ipDenied) return ipDenied;

        const user = await requireUser(request);
        if (!user?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userDenied = await limitRequest(request, {
          strict: true,
          buckets: [
            {
              name: "routine-create",
              limit: LIMITS.routineCreate.limit,
              windowMs: LIMITS.routineCreate.windowMs,
              id: user.id,
            },
            {
              name: "routine-create-burst",
              limit: LIMITS.routineCreateBurst.limit,
              windowMs: LIMITS.routineCreateBurst.windowMs,
              id: user.id,
            },
          ],
        });
        if (userDenied) return userDenied;

        const [{ value: existing }] = await db
          .select({ value: count() })
          .from(routines)
          .where(eq(routines.userId, user.id));
        if ((existing ?? 0) >= LIMITS.maxRoutines) {
          return Response.json(
            { error: `Routine limit reached (${LIMITS.maxRoutines})` },
            { status: 400 },
          );
        }

        const body = await request.json().catch(() => null);
        const parsed = routineInputSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid input", details: parsed.error.flatten() },
            { status: 400 },
          );
        }

        const data = parsed.data;
        const [routine] = await db
          .insert(routines)
          .values({
            userId: user.id,
            title: data.title,
            notes: data.notes ?? null,
            category: data.category,
            rruleKind: data.rruleKind,
            intervalDays:
              data.rruleKind === "every_n_days" ? data.intervalDays : null,
            weekday: data.rruleKind === "weekly" ? data.weekday : null,
            monthDay: data.rruleKind === "monthly" ? data.monthDay : null,
            preferredTime: data.preferredTime ?? null,
            timezone: data.timezone,
            active: data.active ?? true,
            anchorDate: data.anchorDate
              ? new Date(data.anchorDate)
              : new Date(),
          })
          .returning();

        await ensureOccurrencesForRoutine(routine);

        return Response.json({ routine }, { status: 201 });
      },
    },
  },
});
