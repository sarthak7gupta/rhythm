import { Mail } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconLabel } from "@/components/IconLabel";
import {
  applyEmailDomain,
  matchingEmailDomains,
} from "@/lib/email-domains";
import { isWellFormedEmail } from "@/lib/security/email-syntax";

export function LoginForm({ error: authError }: { error?: string }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const domainSuggestions = matchingEmailDomains(email);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(
    authError ? t("login.expired") : null,
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      if (!isWellFormedEmail(email)) {
        throw new Error(t("login.invalidEmail"));
      }
      const csrfRes = await fetch("/api/auth/csrf");
      const csrf = await csrfRes.json();
      const response = await fetch("/api/auth/signin/nodemailer", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          csrfToken: csrf.csrfToken ?? "",
          email,
          callbackUrl: "/today",
          json: "true",
        }),
      });
      if (response.status === 429) {
        throw new Error(t("login.tooMany"));
      }
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.error) {
        const code = result?.error ?? result?.code;
        const message =
          code === "DisposableEmail"
            ? t("login.disposableEmail")
            : code === "InvalidEmail"
              ? t("login.invalidEmail")
              : code === "Configuration"
                ? t("login.configError")
                : t("login.sendFailed");
        throw new Error(message);
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : t("login.sendFailed"));
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
        <h2 className="font-display text-2xl">{t("login.checkTitle")}</h2>
        <p className="mt-2 text-[var(--muted)]">
          {t("login.checkBody", { email })}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm text-[var(--muted)]">{t("login.email")}</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("login.emailPlaceholder")}
          className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 outline-none ring-[var(--accent)] focus:ring-2"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
        />
        {domainSuggestions.length > 0 ? (
          <div
            className="flex flex-wrap gap-2 pt-1"
            role="listbox"
            aria-label={t("login.domainSuggestions")}
          >
            {domainSuggestions.map((domain) => (
              <button
                key={domain}
                type="button"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setEmail(applyEmailDomain(email, domain))}
                className="cursor-pointer rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--ink)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]"
              >
                @{domain}
              </button>
            ))}
          </div>
        ) : null}
      </label>
      {error ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? (
          t("login.sending")
        ) : (
          <IconLabel icon={Mail} iconClassName="h-4 w-4">
            {t("login.submit")}
          </IconLabel>
        )}
      </button>
    </form>
  );
}
