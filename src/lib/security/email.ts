import exactDisposable from "disposable-email-domains";
import wildcardDisposable from "disposable-email-domains/wildcard.json";
import {
  domainAncestors,
  parseEmailSyntax,
} from "@/lib/security/email-syntax";

/**
 * Inboxes that forward to a real mailbox. The disposable list sometimes
 * treats alias providers as throwaway; we still allow them.
 */
const ALLOWED_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "aol.com",
  "zoho.com",
  "fastmail.com",
  "gmx.com",
  "gmx.net",
  "web.de",
  "mail.com",
  "duck.com",
  "simplelogin.com",
  "simplelogin.io",
  "anonaddy.com",
  "anonaddy.me",
  "passmail.net",
  "mozmail.com",
]);

/** Extra throwaways if the npm list is behind. */
const EXTRA_DISPOSABLE = new Set([
  "mail.tm",
  "mailinator.com",
  "guerrillamail.com",
  "yopmail.com",
  "tempmail.com",
  "tmpmail.org",
  "trashmail.com",
  "getnada.com",
  "inboxkitten.com",
  "tempail.com",
  "emailfake.com",
  "dropmail.me",
  "moakt.com",
]);

const EXACT_DISPOSABLE = new Set(
  exactDisposable.map((domain) => domain.toLowerCase()),
);
const WILDCARD_DISPOSABLE = new Set(
  wildcardDisposable.map((domain) => domain.toLowerCase()),
);

export type SignupEmailReason = "invalid" | "disposable";

export type SignupEmailCheck =
  | { ok: true; email: string }
  | { ok: false; reason: SignupEmailReason };

/** Syntax plus disposable-domain block. Call this on the server before sending mail. */
export function checkSignupEmail(value: string): SignupEmailCheck {
  const parsed = parseEmailSyntax(value);
  if (!parsed) return { ok: false, reason: "invalid" };
  if (isAllowedDomain(parsed.domain)) return { ok: true, email: parsed.email };
  if (isDisposableDomain(parsed.domain)) {
    return { ok: false, reason: "disposable" };
  }
  return { ok: true, email: parsed.email };
}

export function signupEmailErrorCode(reason: SignupEmailReason): string {
  return reason === "disposable" ? "DisposableEmail" : "InvalidEmail";
}

function isAllowedDomain(domain: string): boolean {
  return domainAncestors(domain).some((item) => ALLOWED_DOMAINS.has(item));
}

function isDisposableDomain(domain: string): boolean {
  return domainAncestors(domain).some(
    (item) =>
      EXTRA_DISPOSABLE.has(item) ||
      EXACT_DISPOSABLE.has(item) ||
      WILDCARD_DISPOSABLE.has(item),
  );
}
