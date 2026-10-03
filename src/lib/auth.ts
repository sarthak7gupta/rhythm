import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { StartAuthJSConfig } from "start-authjs";
import Nodemailer from "@auth/core/providers/nodemailer";
import { createTransport } from "nodemailer";
import { Resend } from "resend";
import { getDb } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

const TEST_FROM = "Rhythm <onboarding@resend.dev>";

const UNVERIFIABLE_FROM_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "example.com",
  "authjs.dev",
]);

function envFromRaw() {
  return process.env.EMAIL_FROM?.trim().replace(/^["']|["']$/g, "") ?? "";
}

function extractEmailAddress(from: string) {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] ?? from).trim().toLowerCase();
}

function parseNamedEmail(from: string, fallbackName = "Rhythm") {
  const match = from.match(/^(.*)<([^>]+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^["']|["']$/g, "") || fallbackName;
    return { name, email: match[2].trim() };
  }
  return { name: fallbackName, email: from.trim() };
}

function resolveResendFromAddress() {
  const raw = envFromRaw();
  if (!raw) return TEST_FROM;
  const email = extractEmailAddress(raw);
  const domain = email.split("@")[1] ?? "";
  if (
    !domain ||
    UNVERIFIABLE_FROM_DOMAINS.has(domain) ||
    email.startsWith("no-reply@") ||
    email.startsWith("noreply@")
  ) {
    return TEST_FROM;
  }
  return raw;
}

function resolveSmtpFromAddress() {
  const raw = envFromRaw();
  if (raw) return raw;
  if (process.env.EMAIL_SERVER_USER) {
    return `Rhythm <${process.env.EMAIL_SERVER_USER}>`;
  }
  return TEST_FROM;
}

function magicLinkHtml(url: string) {
  return `
      <div style="font-family: Georgia, serif; max-width: 420px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 28px; color: #1c3d36;">Rhythm</h1>
        <p style="color: #3d4f4a; line-height: 1.5;">
          Tap the button below to sign in. This link expires soon and can only be used once.
        </p>
        <p style="margin: 28px 0;">
          <a href="${url}"
             style="background:#2f6f62;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-family:system-ui,sans-serif;">
            Sign in
          </a>
        </p>
        <p style="color:#7a8a85;font-size:13px;">If you did not request this, you can ignore this email.</p>
      </div>
    `;
}

async function sendVerificationRequest(params: {
  identifier: string;
  url: string;
  provider: { server?: unknown; from?: string };
}) {
  const { identifier, url, provider } = params;
  const html = magicLinkHtml(url);
  const text = `Sign in to Rhythm\n\n${url}\n\n`;

  if (process.env.BREVO_API_KEY) {
    await sendViaBrevo({ identifier, html, text });
    return;
  }

  if (process.env.RESEND_API_KEY) {
    const fromAddress = resolveResendFromAddress();
    console.info("[rhythm] sending magic link via Resend", {
      from: fromAddress,
      to: identifier,
    });
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: [identifier],
      subject: "Sign in to Rhythm",
      html,
      text,
    });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  if (!process.env.EMAIL_SERVER) {
    console.log("\n========== Rhythm magic link ==========");
    console.log(`To: ${identifier}`);
    console.log(url);
    console.log("=======================================\n");
    return;
  }

  const transport = createTransport(provider.server as string);
  const result = await transport.sendMail({
    to: identifier,
    from: resolveSmtpFromAddress(),
    subject: "Sign in to Rhythm",
    text,
    html,
  });

  const failed = result.rejected.concat(result.pending).filter(Boolean);
  if (failed.length) {
    throw new Error(`Email(s) (${failed.join(", ")}) could not be sent`);
  }
}

async function sendViaBrevo(params: {
  identifier: string;
  html: string;
  text: string;
}) {
  const raw = envFromRaw() || TEST_FROM;
  const sender = parseNamedEmail(raw);
  console.info("[rhythm] sending magic link via Brevo", {
    from: `${sender.name} <${sender.email}>`,
    to: params.identifier,
  });
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY ?? "",
    },
    body: JSON.stringify({
      sender: { name: sender.name, email: sender.email },
      to: [{ email: params.identifier }],
      subject: "Sign in to Rhythm",
      htmlContent: params.html,
      textContent: params.text,
    }),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : `Brevo HTTP ${response.status}`;
    throw new Error(message);
  }
}

export function getAuthConfig(): StartAuthJSConfig {
  return {
    trustHost: true,
    secret: process.env.AUTH_SECRET,
    basePath: "/api/auth",
    pages: {
      signIn: "/login",
      verifyRequest: "/login/check-email",
      error: "/login",
    },
    session: {
      strategy: "jwt",
    },
    adapter: DrizzleAdapter(getDb(), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    providers: [
      Nodemailer({
        server: process.env.EMAIL_SERVER ?? "smtp://127.0.0.1:1025",
        from: process.env.BREVO_API_KEY
          ? resolveSmtpFromAddress()
          : resolveResendFromAddress(),
        sendVerificationRequest,
      }),
    ],
    callbacks: {
      jwt({ token, user }) {
        if (user) {
          token.sub = user.id;
        }
        return token;
      },
      session({ session, token }) {
        if (session.user && token.sub) {
          session.user.id = token.sub;
        }
        return session;
      },
    },
  };
}
