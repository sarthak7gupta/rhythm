import { useState, useTransition } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlarmClock,
  AlertTriangle,
  CalendarPlus,
  Check,
  Clock,
  Plus,
  SkipForward,
  Sunrise,
  Undo2,
} from "lucide-react";
import { IconLabel } from "@/components/IconLabel";
import { categoryLabel, recurrenceLabel } from "@/lib/i18n/labels";
import { formatDueLabel } from "@/lib/recurrence";

export type TodayItem = {
  occurrence: {
    id: number;
    dueAt: string | Date;
    snoozedUntil: string | Date | null;
    status: "pending" | "done" | "skipped";
    completedAt: string | Date | null;
  };
  routine: {
    id: number;
    title: string;
    notes: string | null;
    category: string;
    timezone: string;
    rruleKind: "every_n_days" | "weekly" | "monthly";
    intervalDays: number | null;
    weekday: number | null;
    monthDay: number | null;
    preferredTime: string | null;
  };
  overdue: boolean;
  late: boolean;
};

export function TodayList({ initialItems }: { initialItems: TodayItem[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  async function act(
    occurrenceId: number,
    action: "complete" | "skip" | "undo" | "snooze",
    kind?: "later_today" | "tomorrow" | "plus_2_days",
  ) {
    setPendingId(occurrenceId);
    try {
      const response = await fetch(`/api/occurrences/${occurrenceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "snooze" ? { action, kind } : { action },
        ),
      });
      if (!response.ok) {
        throw new Error("Request failed");
      }
      startTransition(() => {
        void router.invalidate();
      });
      const today = await fetch("/api/occurrences/today").then((r) => r.json());
      setItems(today.items);
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-6 py-12 text-center">
        <p className="font-display text-2xl text-[var(--ink)]">
          {t("today.emptyTitle")}
        </p>
        <p className="mt-2 text-[var(--muted)]">{t("today.emptyBody")}</p>
        <Link
          to="/routines/new"
          className="mt-6 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t("today.addRoutine")}
        </Link>
      </div>
    );
  }

  const pending = items.filter((item) => item.occurrence.status === "pending");
  const settled = items.filter((item) => item.occurrence.status !== "pending");

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        {pending.map((item) => {
          const dueAt = new Date(
            item.occurrence.snoozedUntil ?? item.occurrence.dueAt,
          );
          const snoozed = item.occurrence.snoozedUntil != null;
          const busy = pendingId === item.occurrence.id || isPending;
          return (
            <article
              key={item.occurrence.id}
              className={`rounded-3xl border bg-[var(--surface)] p-4 shadow-[0_1px_0_rgba(28,61,54,0.04)] transition ${
                item.overdue
                  ? "border-[var(--warn)]/40"
                  : "border-[var(--line)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  disabled={busy}
                  aria-label={t("today.markDone", {
                    title: item.routine.title,
                  })}
                  onClick={() => act(item.occurrence.id, "complete")}
                  className="mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--accent)] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="h-4 w-4" aria-hidden />
                  <span className="sr-only">{t("today.done")}</span>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/routines/$id"
                      params={{ id: String(item.routine.id) }}
                      className="truncate font-medium text-[var(--ink)] hover:underline"
                    >
                      {item.routine.title}
                    </Link>
                    {item.overdue ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warn-soft)] px-2 py-0.5 text-xs text-[var(--warn)]">
                        <AlertTriangle className="h-3 w-3" aria-hidden />
                        {t("today.overdue")}
                      </span>
                    ) : null}
                    {snoozed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]">
                        <AlarmClock className="h-3 w-3" aria-hidden />
                        {t("today.snoozed")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {categoryLabel(item.routine.category, t)} ·{" "}
                    {formatDueLabel(
                      dueAt,
                      item.routine.timezone,
                      item.routine.preferredTime,
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {recurrenceLabel(item.routine, t)}
                  </p>
                  {item.routine.notes ? (
                    <p className="mt-2 text-sm text-[var(--ink)]/80">
                      {item.routine.notes}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(
                      [
                        ["later_today", "today.snoozeLater", Clock],
                        ["tomorrow", "today.snoozeTomorrow", Sunrise],
                        ["plus_2_days", "today.snoozePlusTwo", CalendarPlus],
                      ] as const
                    ).map(([kind, labelKey, Icon]) => (
                      <button
                        key={kind}
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          act(item.occurrence.id, "snooze", kind)
                        }
                        className="cursor-pointer rounded-full border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <IconLabel icon={Icon}>{t(labelKey)}</IconLabel>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act(item.occurrence.id, "skip")}
                  className="cursor-pointer rounded-full px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconLabel icon={SkipForward}>{t("today.skip")}</IconLabel>
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {settled.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            {t("today.doneToday")}
          </h2>
          <div className="space-y-2">
            {settled.map((item) => (
              <article
                key={item.occurrence.id}
                className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)]/70 px-4 py-3"
              >
                <div>
                  <p
                    className={`font-medium ${
                      item.occurrence.status === "skipped"
                        ? "text-[var(--muted)] line-through"
                        : "text-[var(--ink)]"
                    }`}
                  >
                    {item.routine.title}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {item.occurrence.status === "skipped"
                      ? t("today.skipped")
                      : item.late
                        ? t("today.doneLate")
                        : t("today.onTime")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => act(item.occurrence.id, "undo")}
                  className="cursor-pointer text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  <IconLabel icon={Undo2}>{t("today.undo")}</IconLabel>
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
