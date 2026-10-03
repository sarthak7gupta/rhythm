import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/login_/check-email")({
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12 text-center">
      <h1 className="font-display text-4xl text-[var(--ink)]">
        {t("login.checkTitle")}
      </h1>
      <p className="mt-3 text-[var(--muted)]">{t("login.checkPageBody")}</p>
      <Link
        to="/login"
        search={{ error: undefined, callbackUrl: undefined }}
        className="mt-8 text-[var(--accent)] hover:underline"
      >
        {t("login.back")}
      </Link>
    </main>
  );
}
