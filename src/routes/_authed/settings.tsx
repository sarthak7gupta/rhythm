import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Bell, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconLabel } from "@/components/IconLabel";
import { PushSettings } from "@/components/PushSettings";
import { loadSettingsPage } from "@/lib/app-data";
import { getAuthedUser } from "@/lib/auth/server";

const loadSettings = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getAuthedUser();
  if (!user?.id) {
    return { email: null, timezone: "Asia/Kolkata" };
  }
  return loadSettingsPage(user.id, user.email ?? null);
});

export const Route = createFileRoute("/_authed/settings")({
  loader: () => loadSettings(),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  const { email, timezone } = Route.useLoaderData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-[var(--ink)]">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-[var(--muted)]">{t("settings.subtitle")}</p>
      </div>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          <IconLabel icon={User} iconClassName="h-3.5 w-3.5">
            {t("settings.account")}
          </IconLabel>
        </h2>
        <p className="mt-3 text-[var(--ink)]">
          {email ?? t("settings.signedIn")}
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {t("settings.timezone", { timezone })}
        </p>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          <IconLabel icon={Bell} iconClassName="h-3.5 w-3.5">
            {t("settings.push")}
          </IconLabel>
        </h2>
        <PushSettings />
      </section>
    </div>
  );
}
