import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LoginForm } from "@/components/LoginForm";
import { getAuthedUser } from "@/lib/auth/server";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    error: typeof search.error === "string" ? search.error : undefined,
    callbackUrl:
      typeof search.callbackUrl === "string" ? search.callbackUrl : undefined,
  }),
  beforeLoad: async () => {
    const user = await getAuthedUser();
    if (user) {
      throw redirect({ to: "/today" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { error } = Route.useSearch();
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-10 text-center">
        <p className="font-display text-5xl text-[var(--ink)]">
          {t("app.name")}
        </p>
        <p className="mt-3 text-[var(--muted)]">{t("login.tagline")}</p>
      </div>
      <LoginForm error={error} />
    </main>
  );
}
