import { createFileRoute } from "@tanstack/react-router";
import { getVapidPublicKey } from "@/lib/push";
import { requireUser } from "@/lib/auth/session";
import { guardApiRead } from "@/lib/security/rate-limit";

export const Route = createFileRoute("/api/push/vapid")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await guardApiRead(request);
        if (denied) return denied;

        const user = await requireUser(request);
        if (!user?.id) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const publicKey = getVapidPublicKey();
        if (!publicKey) {
          return Response.json(
            { error: "Push is not configured", publicKey: null },
            { status: 503 },
          );
        }

        return Response.json({ publicKey });
      },
    },
  },
});
