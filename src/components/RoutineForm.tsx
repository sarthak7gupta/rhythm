import { useRouter } from "@tanstack/react-router";
import { Plus, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { IconLabel } from "@/components/IconLabel";
import type { Category, RruleKind } from "@/lib/db/schema";

type RoutineFormValues = {
  title: string;
  notes: string;
  category: Category;
  rruleKind: RruleKind;
  intervalDays: number;
  weekday: number;
  monthDay: number;
  preferredTime: string;
  timezone: string;
  active: boolean;
  startDate: string;
};

function todayInputDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const defaultValues: RoutineFormValues = {
  title: "",
  notes: "",
  category: "household",
  rruleKind: "every_n_days",
  intervalDays: 7,
  weekday: 0,
  monthDay: 1,
  preferredTime: "",
  timezone:
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "Asia/Kolkata",
  active: true,
  startDate: todayInputDate(),
};

export function RoutineForm({
  mode,
  routineId,
  initial,
}: {
  mode: "create" | "edit";
  routineId?: number;
  initial?: Partial<RoutineFormValues>;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [values, setValues] = useState<RoutineFormValues>({
    ...defaultValues,
    ...initial,
    startDate: initial?.startDate ?? defaultValues.startDate,
    preferredTime: initial?.preferredTime || "09:00",
  });
  const [hasTime, setHasTime] = useState(Boolean(initial?.preferredTime));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    if (values.rruleKind === "every_n_days") {
      return values.intervalDays === 1
        ? t("form.repeatsEveryDay")
        : t("form.repeatsEveryNDays", { count: values.intervalDays });
    }
    if (values.rruleKind === "weekly") {
      return t("form.repeatsWeekly", {
        day: t(`weekday.${values.weekday}`),
      });
    }
    return t("form.repeatsMonthly", { day: values.monthDay });
  }, [t, values]);

  function update<K extends keyof RoutineFormValues>(
    key: K,
    value: RoutineFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      title: values.title,
      notes: values.notes || null,
      category: values.category,
      rruleKind: values.rruleKind,
      intervalDays:
        values.rruleKind === "every_n_days" ? values.intervalDays : null,
      weekday: values.rruleKind === "weekly" ? values.weekday : null,
      monthDay: values.rruleKind === "monthly" ? values.monthDay : null,
      preferredTime: hasTime ? values.preferredTime : null,
      timezone: values.timezone,
      active: values.active,
      anchorDate:
        values.rruleKind === "every_n_days" && values.intervalDays !== 1
          ? `${values.startDate}T12:00:00`
          : undefined,
    };

    try {
      const response = await fetch(
        mode === "create" ? "/api/routines" : `/api/routines/${routineId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? t("form.saveFailed"));
      }
      await router.navigate({
        to: "/routines/$id",
        params: { id: String(data.routine.id) },
      });
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block space-y-1.5">
        <span className="text-sm text-[var(--muted)]">{t("form.title")}</span>
        <input
          required
          value={values.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder={t("form.titlePlaceholder")}
          className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 outline-none ring-[var(--accent)] focus:ring-2"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm text-[var(--muted)]">{t("form.notes")}</span>
        <textarea
          value={values.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          placeholder={t("form.notesPlaceholder")}
          className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 outline-none ring-[var(--accent)] focus:ring-2"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm text-[var(--muted)]">
            {t("form.category")}
          </span>
          <select
            value={values.category}
            onChange={(e) => update("category", e.target.value as Category)}
            className="w-full cursor-pointer rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 outline-none"
          >
            <option value="household">{t("category.household")}</option>
            <option value="hygiene">{t("category.hygiene")}</option>
            <option value="external">{t("category.external")}</option>
            <option value="other">{t("category.other")}</option>
          </select>
        </label>

        <div className="space-y-1.5">
          <label className="flex items-center gap-3 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              checked={hasTime}
              onChange={(e) => setHasTime(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-[var(--line)]"
            />
            {t("form.addTime")}
          </label>
          {hasTime ? (
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--muted)]">
                {t("form.preferredTime")}
              </span>
              <input
                type="time"
                value={values.preferredTime}
                onChange={(e) => update("preferredTime", e.target.value)}
                className="w-full cursor-pointer rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 outline-none"
              />
            </label>
          ) : (
            <p className="text-sm text-[var(--muted)]">{t("form.dayOnly")}</p>
          )}
        </div>
      </div>

      <fieldset className="space-y-3 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <legend className="px-1 text-sm text-[var(--muted)]">
          {t("form.howOften")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["every_n_days", "form.everyNDays"],
              ["weekly", "form.weekly"],
              ["monthly", "form.monthly"],
            ] as const
          ).map(([value, labelKey]) => (
            <button
              key={value}
              type="button"
              onClick={() => update("rruleKind", value)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-sm ${
                values.rruleKind === value
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-elevated)] text-[var(--muted)]"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {values.rruleKind === "every_n_days" ? (
          <>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--muted)]">
                {t("form.interval")}
              </span>
              <input
                type="number"
                min={1}
                max={365}
                value={values.intervalDays}
                onChange={(e) => update("intervalDays", Number(e.target.value))}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3 outline-none"
              />
            </label>
            {values.intervalDays !== 1 ? (
              <label className="block space-y-1.5">
                <span className="text-sm text-[var(--muted)]">
                  {t("form.startDate")}
                </span>
                <input
                  type="date"
                  value={values.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                  className="w-full cursor-pointer rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3 outline-none"
                />
              </label>
            ) : null}
          </>
        ) : null}

        {values.rruleKind === "weekly" ? (
          <label className="block space-y-1.5">
            <span className="text-sm text-[var(--muted)]">
              {t("form.weekday")}
            </span>
            <select
              value={values.weekday}
              onChange={(e) => update("weekday", Number(e.target.value))}
              className="w-full cursor-pointer rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3 outline-none"
            >
              {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                <option key={index} value={index}>
                  {t(`weekday.${index}`)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {values.rruleKind === "monthly" ? (
          <label className="block space-y-1.5">
            <span className="text-sm text-[var(--muted)]">
              {t("form.monthDay")}
            </span>
            <input
              type="number"
              min={1}
              max={31}
              value={values.monthDay}
              onChange={(e) => update("monthDay", Number(e.target.value))}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3 outline-none"
            />
            <span className="block text-xs text-[var(--muted)]">
              {t("form.monthDayHint")}
            </span>
          </label>
        ) : null}

        <p className="text-sm text-[var(--accent)]">{preview}</p>
      </fieldset>

      {mode === "edit" ? (
        <label className="flex items-center gap-3 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            checked={values.active}
            onChange={(e) => update("active", e.target.checked)}
            className="h-4 w-4 rounded border-[var(--line)]"
          />
          {t("form.active")}
        </label>
      ) : null}

      {error ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? (
          t("form.saving")
        ) : (
          <IconLabel
            icon={mode === "create" ? Plus : Save}
            iconClassName="h-4 w-4"
          >
            {mode === "create" ? t("form.create") : t("form.save")}
          </IconLabel>
        )}
      </button>
    </form>
  );
}
