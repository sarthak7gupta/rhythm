/** Domains offered as pills once the user types `@` on the login form. */
export const EMAIL_DOMAIN_SUGGESTIONS = [
  "gmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "hotmail.com",
  "proton.me",
] as const;

export function matchingEmailDomains(email: string): string[] {
  const at = email.indexOf("@");
  if (at < 0) return [];
  const local = email.slice(0, at).trim();
  if (!local) return [];
  const typed = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  return EMAIL_DOMAIN_SUGGESTIONS.filter(
    (domain) => domain !== typed && domain.startsWith(typed),
  );
}

export function applyEmailDomain(email: string, domain: string): string {
  const at = email.indexOf("@");
  const local = (at < 0 ? email : email.slice(0, at)).trim();
  return `${local}@${domain}`;
}
