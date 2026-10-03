import { createFileRoute } from "@tanstack/react-router";
import { authorizeCron } from "@/lib/cron";
import { ensureOccurrencesForAllActive } from "@/lib/occurrences/ensure";
import { sendDueReminders } from "@/lib/push";
import { pruneRateLimits } from "@/lib/security/rate-limit";

export const Route = createFileRoute("/api/cron/generate-occurrences")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = authorizeCron(request);
        if (denied) return denied;

        const created = await ensureOccurrencesForAllActive({ daysAhead: 30 });
        const reminders = await sendDueReminders();
        const pruned = await pruneRateLimits();
        return Response.json({ ok: true, created, reminders, pruned });
      },
    },
  },
});
