import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconLabel } from "@/components/IconLabel";
import { RoutineActions } from "@/components/RoutineActions";
import { loadRoutineDetail } from "@/lib/app-data";
import { getAuthedUser } from "@/lib/auth/server";
import { categoryLabel, recurrenceLabel } from "@/lib/i18n/labels";
import { formatDueLabel, isLateCompletion } from "@/lib/recurrence";

const loadDetail = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const user = await getAuthedUser();
    if (!user?.id) return null;
    return loadRoutineDetail(user.id, data);
  });

export const Route = createFileRoute("/_authed/routines/$id")({
  loader: async ({ params }) => {
    const data = await loadDetail({ data: params.id });
    if (!data) throw notFound();
    return data;
  },
  component: RoutineDetailPage,
});

function RoutineDetailPage() {
  const { t } = useTranslation();
  const { routine, history, stats } = Route.useLoaderData();

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/routines"
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          {t("routines.back")}
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl text-[var(--ink)]">
              {routine.title}
            </h1>
            <p className="mt-1 text-[var(--muted)]">
              {categoryLabel(routine.category, t)} ·{" "}
              {recurrenceLabel(routine, t)}
              {!routine.active ? ` · ${t("routines.paused")}` : ""}
            </p>
            {routine.notes ? (
              <p className="mt-3 max-w-prose text-[var(--ink)]/80">
                {routine.notes}
              </p>
            ) : null}
          </div>
          <Link
            to="/routines/$id/edit"
            params={{ id: String(routine.id) }}
            className="inline-flex cursor-pointer items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm"
          >
            <IconLabel icon={Pencil} iconClassName="h-4 w-4">
              {t("routines.edit")}
            </IconLabel>
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label={t("routines.completion")}
          value={`${Math.round(stats.completionRate * 100)}%`}
        />
        <Stat
          label={t("routines.onTime")}
          value={`${Math.round(stats.onTimeRate * 100)}%`}
        />
        <Stat
          label={t("routines.onTimeStreak")}
          value={`${stats.onTimeStreak}`}
        />
        <Stat
          label={t("routines.avgDaysLate")}
          value={
            stats.averageDaysLate == null
              ? "—"
              : stats.averageDaysLate.toFixed(1)
          }
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          {t("routines.history")}
        </h2>
        {history.length === 0 ? (
          <p className="text-[var(--muted)]">{t("routines.noHistory")}</p>
        ) : (
          <ul className="space-y-2">
            {history.map((occurrence) => {
              const late =
                occurrence.status === "done" &&
                occurrence.completedAt != null &&
                isLateCompletion(
                  new Date(occurrence.dueAt),
                  new Date(occurrence.completedAt),
                  routine.timezone,
                );
              const statusLabel =
                occurrence.status === "pending"
                  ? t("routines.pending")
                  : occurrence.status === "skipped"
                    ? t("routines.skipped")
                    : late
                      ? t("routines.doneLate")
                      : t("routines.done");
              return (
                <li
                  key={occurrence.id}
                  className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
                >
                  <span>
                    {formatDueLabel(
                      new Date(occurrence.dueAt),
                      routine.timezone,
                      routine.preferredTime,
                    )}
                  </span>
                  <span className="text-[var(--muted)]">{statusLabel}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <RoutineActions routineId={routine.id} active={routine.active} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl text-[var(--ink)]">{value}</p>
    </div>
  );
}
