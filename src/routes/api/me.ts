import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { guardApiRead, guardApiWrite } from "@/lib/security/rate-limit";

const patchSchema = z.object({
  notifyEnabled: z.boolean().optional(),
  timezone: z.string().min(1).max(64).optional(),
});

export const Route = createFileRoute("/api/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await guardApiRead(request);
        if (denied) return denied;

        const sessionUser = await requireUser(request);
        if (!sessionUser?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = getDb();
        const row = await db.query.users.findFirst({
          where: eq(users.id, sessionUser.id),
        });

        return Response.json({
          user: {
            id: sessionUser.id,
            email: sessionUser.email,
            name: sessionUser.name,
            notifyEnabled: row?.notifyEnabled ?? true,
            timezone: row?.timezone ?? "Asia/Kolkata",
          },
        });
      },
      PATCH: async ({ request }) => {
        const writeDenied = await guardApiWrite(request);
        if (writeDenied) return writeDenied;

        const sessionUser = await requireUser(request);
        if (!sessionUser?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Invalid input" }, { status: 400 });
        }

        const db = getDb();
        const [updated] = await db
          .update(users)
          .set({
            ...(parsed.data.notifyEnabled !== undefined
              ? { notifyEnabled: parsed.data.notifyEnabled }
              : {}),
            ...(parsed.data.timezone ? { timezone: parsed.data.timezone } : {}),
          })
          .where(eq(users.id, sessionUser.id))
          .returning();

        return Response.json({
          user: {
            id: updated.id,
            email: updated.email,
            notifyEnabled: updated.notifyEnabled,
            timezone: updated.timezone,
          },
        });
      },
    },
  },
});
