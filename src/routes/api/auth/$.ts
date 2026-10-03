import { Auth } from "@auth/core";
import { createFileRoute } from "@tanstack/react-router";
import { getAuthConfig } from "@/lib/auth";
import {
  checkSignupEmail,
  signupEmailErrorCode,
} from "@/lib/security/email";
import { LIMITS } from "@/lib/security/limits";
import {
  limitRequest,
  normalizeEmail,
  rejectHugeBody,
} from "@/lib/security/rate-limit";

function isEmailSignIn(url: URL) {
  return (
    url.pathname.endsWith("/signin/nodemailer") ||
    url.pathname.endsWith("/signin/email")
  );
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await limitRequest(request, {
          buckets: [
            {
              name: "auth-read",
              limit: LIMITS.authRead.limit,
              windowMs: LIMITS.authRead.windowMs,
            },
          ],
        });
        if (denied) return denied;
        return Auth(request, getAuthConfig());
      },
      POST: async ({ request }) => {
        const oversized = rejectHugeBody(request);
        if (oversized) return oversized;

        const writeDenied = await limitRequest(request, {
          buckets: [
            {
              name: "auth-write",
              limit: LIMITS.authWrite.limit,
              windowMs: LIMITS.authWrite.windowMs,
            },
          ],
          strict: true,
        });
        if (writeDenied) return writeDenied;

        const url = new URL(request.url);
        if (isEmailSignIn(url)) {
          const form = await request.clone().formData().catch(() => null);
          const submitted = normalizeEmail(String(form?.get("email") ?? ""));
          const signup = checkSignupEmail(submitted);
          if (!signup.ok) {
            return Response.json(
              { error: signupEmailErrorCode(signup.reason) },
              { status: 400 },
            );
          }
          const email = signup.email;
          const emailDenied = await limitRequest(request, {
            strict: true,
            buckets: [
              {
                name: "email-ip",
                limit: LIMITS.emailIp.limit,
                windowMs: LIMITS.emailIp.windowMs,
              },
              ...(email
                ? [
                    {
                      name: "email-addr",
                      limit: LIMITS.emailAddr.limit,
                      windowMs: LIMITS.emailAddr.windowMs,
                      id: email,
                    },
                  ]
                : []),
              {
                name: "email-global",
                limit: LIMITS.emailGlobal.limit,
                windowMs: LIMITS.emailGlobal.windowMs,
                id: "all",
              },
            ],
          });
          if (emailDenied) return emailDenied;
        }

        return Auth(request, getAuthConfig());
      },
    },
  },
});
