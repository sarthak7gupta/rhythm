import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/auth/session";
import { getTodayOccurrences } from "@/lib/occurrences/today";
import { serializeTodayItems } from "@/lib/app-data";
import { guardApiRead } from "@/lib/security/rate-limit";

export const Route = createFileRoute("/api/occurrences/today")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await guardApiRead(request);
        if (denied) return denied;

        const user = await requireUser(request);
        if (!user?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();
        const items = await getTodayOccurrences(user.id, now);
        return Response.json({ items: serializeTodayItems(items, now) });
      },
    },
  },
});
