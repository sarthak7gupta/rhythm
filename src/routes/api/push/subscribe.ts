import { createFileRoute } from "@tanstack/react-router";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { pushSubscriptions, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { LIMITS } from "@/lib/security/limits";
import { guardApiWrite } from "@/lib/security/rate-limit";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  platform: z.enum(["web", "ios", "android", "macos"]).default("web"),
});

export const Route = createFileRoute("/api/push/subscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const writeDenied = await guardApiWrite(request);
        if (writeDenied) return writeDenied;

        const user = await requireUser(request);
        if (!user?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        const parsed = subscribeSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid subscription" },
            { status: 400 },
          );
        }

        const db = getDb();
        const [{ value: existing }] = await db
          .select({ value: count() })
          .from(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, user.id));
        const already = await db.query.pushSubscriptions.findFirst({
          where: and(
            eq(pushSubscriptions.userId, user.id),
            eq(pushSubscriptions.endpoint, parsed.data.endpoint),
          ),
        });
        if (!already && (existing ?? 0) >= LIMITS.maxPushSubscriptions) {
          return Response.json(
            {
              error: `Device limit reached (${LIMITS.maxPushSubscriptions})`,
            },
            { status: 400 },
          );
        }
        await db
          .insert(pushSubscriptions)
          .values({
            userId: user.id,
            platform: parsed.data.platform,
            endpoint: parsed.data.endpoint,
            p256dh: parsed.data.keys.p256dh,
            auth: parsed.data.keys.auth,
            userAgent: request.headers.get("user-agent"),
          })
          .onConflictDoUpdate({
            target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
            set: {
              p256dh: parsed.data.keys.p256dh,
              auth: parsed.data.keys.auth,
              platform: parsed.data.platform,
              userAgent: request.headers.get("user-agent"),
            },
          });

        await db
          .update(users)
          .set({ notifyEnabled: true })
          .where(eq(users.id, user.id));

        return Response.json({ ok: true });
      },
      DELETE: async ({ request }) => {
        const writeDenied = await guardApiWrite(request);
        if (writeDenied) return writeDenied;

        const user = await requireUser(request);
        if (!user?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        const endpoint =
          body && typeof body.endpoint === "string" ? body.endpoint : null;

        const db = getDb();
        if (endpoint) {
          await db
            .delete(pushSubscriptions)
            .where(
              and(
                eq(pushSubscriptions.userId, user.id),
                eq(pushSubscriptions.endpoint, endpoint),
              ),
            );
        } else {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.userId, user.id));
        }

        return Response.json({ ok: true });
      },
    },
  },
});
