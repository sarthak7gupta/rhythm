import { normalizeEmail } from "@/lib/security/limits";

const EMAIL_MAX = 254;
const LOCAL_MAX = 64;

/** Reserved names that never receive mail. */
const RESERVED_DOMAINS = new Set([
  "example.com",
  "example.net",
  "example.org",
  "example.edu",
  "localhost",
  "invalid",
]);

const RESERVED_TLDS = new Set([
  "local",
  "localhost",
  "invalid",
  "test",
  "example",
  "internal",
  "lan",
  "home",
  "corp",
  "localdomain",
]);

const LOCAL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD_RE = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/;

export type ParsedEmail = {
  email: string;
  local: string;
  domain: string;
};

/**
 * Normalize and accept only a deliverable-looking address (one `@`, DNS-shaped
 * domain with a real TLD). Does not consult disposable lists.
 */
export function parseEmailSyntax(value: string): ParsedEmail | null {
  const email = normalizeEmail(value);
  if (!email || email.length > EMAIL_MAX || email.includes(" ")) return null;

  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@")) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || local.length > LOCAL_MAX) return null;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return null;
  }
  if (!LOCAL_RE.test(local)) return null;
  if (!isDnsDomain(domain)) return null;
  if (RESERVED_DOMAINS.has(domain)) return null;

  return { email, local, domain };
}

export function isWellFormedEmail(value: string): boolean {
  return parseEmailSyntax(value) !== null;
}

function isDnsDomain(domain: string): boolean {
  if (
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.includes("..") ||
    domain.includes("_")
  ) {
    return false;
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(domain)) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1];
  if (!tld || RESERVED_TLDS.has(tld) || !TLD_RE.test(tld)) return false;
  return labels.every((label) => LABEL_RE.test(label));
}

/** Domain plus parents (`a.b.mail.com` → `a.b.mail.com`, `b.mail.com`, `mail.com`). */
export function domainAncestors(domain: string): string[] {
  const labels = domain.split(".");
  const ancestors: string[] = [];
  for (let index = 0; index < labels.length - 1; index += 1) {
    ancestors.push(labels.slice(index).join("."));
  }
  return ancestors;
}
