import { Link, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Pause, Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconLabel } from "@/components/IconLabel";
import { StarterPack } from "@/components/StarterPack";
import { loadRoutinesPage } from "@/lib/app-data";
import { getAuthedUser } from "@/lib/auth/server";
import { categoryLabel, recurrenceLabel } from "@/lib/i18n/labels";

const loadRoutines = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getAuthedUser();
  if (!user?.id) return [];
  return loadRoutinesPage(user.id);
});

export const Route = createFileRoute("/_authed/routines/")({
  loader: () => loadRoutines(),
  component: RoutinesPage,
});

function RoutinesPage() {
  const { t } = useTranslation();
  const rows = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-[var(--ink)]">
            {t("routines.title")}
          </h1>
          <p className="mt-1 text-[var(--muted)]">{t("routines.subtitle")}</p>
        </div>
        <Link
          to="/routines/new"
          className="inline-flex cursor-pointer items-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          <IconLabel icon={Plus} iconClassName="h-4 w-4">
            {t("routines.new")}
          </IconLabel>
        </Link>
      </div>

      {rows.length > 0 ? (
        <ul className="space-y-3">
          {rows.map((routine) => (
            <li
              key={routine.id}
              className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  to="/routines/$id"
                  params={{ id: String(routine.id) }}
                  className="min-w-0 cursor-pointer hover:underline"
                >
                  <p className="font-medium text-[var(--ink)]">
                    {routine.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {categoryLabel(routine.category, t)} ·{" "}
                    {recurrenceLabel(routine, t)}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  {!routine.active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-xs text-[var(--muted)]">
                      <Pause className="h-3 w-3" aria-hidden />
                      {t("routines.paused")}
                    </span>
                  ) : null}
                  <Link
                    to="/routines/$id/edit"
                    params={{ id: String(routine.id) }}
                    className="cursor-pointer text-sm text-[var(--accent)] hover:underline"
                  >
                    <IconLabel icon={Pencil}>{t("routines.edit")}</IconLabel>
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <StarterPack
        existing={rows.map((row) => ({ id: row.id, title: row.title }))}
      />
    </div>
  );
}
