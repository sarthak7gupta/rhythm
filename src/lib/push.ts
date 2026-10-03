import webpush from "web-push";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { toZonedTime } from "date-fns-tz";
import { getDb } from "@/lib/db";
import {
  occurrences,
  pushSubscriptions,
  routines,
  users,
} from "@/lib/db/schema";
import {
  dueAtForLocalDay,
  endOfDueDayUtc,
  hasClockTime,
} from "@/lib/recurrence";

function vapidConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  );
}

function configureWebPush() {
  if (!vapidConfigured()) {
    throw new Error("VAPID keys are not set");
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export async function sendWebPush(options: {
  endpoint: string;
  p256dh: string;
  auth: string;
  title: string;
  body: string;
  url?: string;
}): Promise<boolean> {
  configureWebPush();
  try {
    await webpush.sendNotification(
      {
        endpoint: options.endpoint,
        keys: { p256dh: options.p256dh, auth: options.auth },
      },
      JSON.stringify({
        title: options.title,
        body: options.body,
        url: options.url ?? "/today",
      }),
    );
    return true;
  } catch (error) {
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : 0;
    if (status === 404 || status === 410) {
      const db = getDb();
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, options.endpoint));
    }
    console.error("web-push failed", status || error);
    return false;
  }
}

export async function sendDueReminders(now: Date = new Date()): Promise<{
  considered: number;
  sent: number;
}> {
  if (!vapidConfigured()) {
    return { considered: 0, sent: 0 };
  }

  const db = getDb();
  const dueRows = await db
    .select({
      occurrence: occurrences,
      routine: routines,
      user: users,
    })
    .from(occurrences)
    .innerJoin(routines, eq(occurrences.routineId, routines.id))
    .innerJoin(users, eq(routines.userId, users.id))
    .where(
      and(
        eq(occurrences.status, "pending"),
        eq(routines.active, true),
        eq(users.notifyEnabled, true),
        lte(occurrences.dueAt, now),
        or(
          isNull(occurrences.lastNotifiedAt),
          lte(
            occurrences.lastNotifiedAt,
            new Date(now.getTime() - 20 * 60 * 60 * 1000),
          ),
        ),
      ),
    );

  let sent = 0;
  for (const row of dueRows) {
    const timezone = row.routine.timezone;
    const notifyAt = hasClockTime(row.routine.preferredTime)
      ? row.occurrence.dueAt
      : dueAtForLocalDay(
          toZonedTime(row.occurrence.dueAt, timezone),
          "09:00",
          timezone,
        );
    if (notifyAt.getTime() > now.getTime()) continue;

    const subscriptions = await db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, row.user.id),
    });
    if (subscriptions.length === 0) continue;

    const overdue = hasClockTime(row.routine.preferredTime)
      ? row.occurrence.dueAt.getTime() < now.getTime() - 60 * 60 * 1000
      : now.getTime() > endOfDueDayUtc(row.occurrence.dueAt, timezone).getTime();
    const title = overdue ? "Overdue on Rhythm" : "Due on Rhythm";
    const body = overdue
      ? `${row.routine.title} is overdue.`
      : `${row.routine.title} is due now.`;

    let delivered = false;
    for (const subscription of subscriptions) {
      if (!subscription.p256dh || !subscription.auth) continue;
      const ok = await sendWebPush({
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        title,
        body,
        url: "/today",
      });
      if (ok) delivered = true;
    }

    if (delivered) {
      sent += 1;
      await db
        .update(occurrences)
        .set({ lastNotifiedAt: now })
        .where(eq(occurrences.id, row.occurrence.id));
    }
  }

  return { considered: dueRows.length, sent };
}
