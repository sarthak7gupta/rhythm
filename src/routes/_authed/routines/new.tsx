import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RoutineForm } from "@/components/RoutineForm";

export const Route = createFileRoute("/_authed/routines/new")({
  component: NewRoutinePage,
});

function NewRoutinePage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/routines"
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          {t("routines.back")}
        </Link>
        <h1 className="mt-2 font-display text-4xl text-[var(--ink)]">
          {t("routines.newTitle")}
        </h1>
        <p className="mt-1 text-[var(--muted)]">{t("routines.newHint")}</p>
      </div>
      <RoutineForm mode="create" />
    </div>
  );
}
