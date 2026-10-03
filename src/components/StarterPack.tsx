import { useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { ListPlus, Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconLabel } from "@/components/IconLabel";
import type { RruleKind } from "@/lib/db/schema";
import {
  remainingStarters,
  starterPack,
  starterPayload,
  type StarterId,
  type StarterTemplate,
} from "@/lib/starters";

type ExistingRoutine = { id: number; title: string };

type StarterChoice = {
  rruleKind: RruleKind;
  intervalDays: number;
  weekday: number;
  monthDay: number;
  startDate: string;
  hasTime: boolean;
  preferredTime: string;
};

function todayInputDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function defaultChoices() {
  const start = todayInputDate();
  return Object.fromEntries(
    starterPack.map((item) => [
      item.id,
      {
        rruleKind: item.rruleKind,
        intervalDays: item.intervalDays ?? 7,
        weekday: item.weekday ?? 0,
        monthDay: item.monthDay ?? 1,
        startDate: start,
        hasTime: false,
        preferredTime: "09:00",
      },
    ]),
  ) as Record<StarterId, StarterChoice>;
}

export function StarterPack({
  existing = [],
}: {
  existing?: ExistingRoutine[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busyId, setBusyId] = useState<StarterId | "all" | null>(null);
  const [editingId, setEditingId] = useState<StarterId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState(defaultChoices);

  const timezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "Asia/Kolkata";

  const remaining = useMemo(
    () =>
      remainingStarters({
        existingTitles: existing.map((row) => row.title),
        starterTitle: (id) => t(`starters.${id}.title`),
      }),
    [existing, t],
  );

  const remainingIds = useMemo(
    () => new Set(remaining.map((item) => item.id)),
    [remaining],
  );
  if (remaining.length === 0) {
    return null;
  }

  function patchChoice(id: StarterId, patch: Partial<StarterChoice>) {
    setChoices((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  function payloadFor(template: StarterTemplate) {
    const choice = choices[template.id];
    const isDaily =
      choice.rruleKind === "every_n_days" && choice.intervalDays === 1;
    return starterPayload(template, {
      title: t(`starters.${template.id}.title`),
      notes: t(`starters.${template.id}.notes`),
      timezone,
      rruleKind: choice.rruleKind,
      intervalDays: choice.intervalDays,
      weekday: choice.weekday,
      monthDay: choice.monthDay,
      preferredTime: choice.hasTime ? choice.preferredTime : null,
      anchorDate:
        choice.rruleKind === "every_n_days" && !isDaily
          ? `${choice.startDate}T12:00:00`
          : undefined,
    });
  }

  async function addIds(ids: StarterId[]) {
    setError(null);
    for (const id of ids) {
      const template = starterPack.find((item) => item.id === id);
      if (!template || !remainingIds.has(id)) continue;
      const response = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFor(template)),
      });
      if (!response.ok) {
        throw new Error(
          response.status === 429 ? t("starters.tooMany") : t("starters.failed"),
        );
      }
    }
    setEditingId(null);
    await router.invalidate();
  }

  async function addOne(id: StarterId) {
    setBusyId(id);
    try {
      await addIds([id]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("starters.failed"));
    } finally {
      setBusyId(null);
    }
  }

  async function addAll() {
    setBusyId("all");
    try {
      await addIds(remaining.map((item) => item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("starters.failed"));
    } finally {
      setBusyId(null);
    }
  }

  const disabled = busyId != null;
  const kinds = [
    ["every_n_days", "form.everyNDays"],
    ["weekly", "form.weekly"],
    ["monthly", "form.monthly"],
  ] as const;

  return (
    <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-6 py-10">
      <p className="font-display text-2xl text-[var(--ink)]">
        {t("starters.title")}
      </p>
      <p className="mt-2 text-[var(--muted)]">{t("starters.body")}</p>
      <ul className="mt-6 space-y-3">
        {remaining.map((item) => {
          const choice = choices[item.id];
          const editing = editingId === item.id;
          const isDaily =
            choice.rruleKind === "every_n_days" && choice.intervalDays === 1;
          return (
            <li
              key={item.id}
              className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--ink)]">
                    {t(`starters.${item.id}.title`)}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">
                    {t(`starters.${item.id}.hint`)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      setEditingId((current) =>
                        current === item.id ? null : item.id,
                      )
                    }
                    className="cursor-pointer text-sm text-[var(--muted)] hover:text-[var(--ink)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <IconLabel icon={Pencil}>{t("starters.edit")}</IconLabel>
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void addOne(item.id)}
                    className="cursor-pointer text-sm text-[var(--accent)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <IconLabel icon={Plus}>
                      {busyId === item.id
                        ? t("starters.adding")
                        : t("starters.add")}
                    </IconLabel>
                  </button>
                </div>
              </div>
              {editing ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {kinds.map(([value, labelKey]) => (
                      <button
                        key={value}
                        type="button"
                        disabled={disabled}
                        onClick={() => patchChoice(item.id, { rruleKind: value })}
                        className={`cursor-pointer rounded-full px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                          choice.rruleKind === value
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--bg-elevated)] text-[var(--muted)]"
                        }`}
                      >
                        {t(labelKey)}
                      </button>
                    ))}
                  </div>
                  {choice.rruleKind === "every_n_days" ? (
                    <>
                      <label className="block space-y-1 text-sm">
                        <span className="text-[var(--muted)]">
                          {t("form.interval")}
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={choice.intervalDays}
                          disabled={disabled}
                          onChange={(event) =>
                            patchChoice(item.id, {
                              intervalDays: Number(event.target.value),
                            })
                          }
                          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 outline-none"
                        />
                      </label>
                      {isDaily ? null : (
                        <label className="block space-y-1 text-sm">
                          <span className="text-[var(--muted)]">
                            {t("form.startDate")}
                          </span>
                          <input
                            type="date"
                            value={choice.startDate}
                            disabled={disabled}
                            onChange={(event) =>
                              patchChoice(item.id, {
                                startDate: event.target.value,
                              })
                            }
                            className="w-full cursor-pointer rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 outline-none"
                          />
                        </label>
                      )}
                    </>
                  ) : null}
                  {choice.rruleKind === "weekly" ? (
                    <label className="block space-y-1 text-sm">
                      <span className="text-[var(--muted)]">
                        {t("form.weekday")}
                      </span>
                      <select
                        value={choice.weekday}
                        disabled={disabled}
                        onChange={(event) =>
                          patchChoice(item.id, {
                            weekday: Number(event.target.value),
                          })
                        }
                        className="w-full cursor-pointer rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 outline-none"
                      >
                        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                          <option key={index} value={index}>
                            {t(`weekday.${index}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {choice.rruleKind === "monthly" ? (
                    <label className="block space-y-1 text-sm">
                      <span className="text-[var(--muted)]">
                        {t("form.monthDay")}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={choice.monthDay}
                        disabled={disabled}
                        onChange={(event) =>
                          patchChoice(item.id, {
                            monthDay: Number(event.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 outline-none"
                      />
                      <span className="block text-xs text-[var(--muted)]">
                        {t("form.monthDayHint")}
                      </span>
                    </label>
                  ) : null}
                  <label className="flex items-center gap-3 text-sm text-[var(--ink)]">
                    <input
                      type="checkbox"
                      checked={choice.hasTime}
                      disabled={disabled}
                      onChange={(event) =>
                        patchChoice(item.id, { hasTime: event.target.checked })
                      }
                      className="h-4 w-4 cursor-pointer rounded border-[var(--line)]"
                    />
                    {t("form.addTime")}
                  </label>
                  {choice.hasTime ? (
                    <label className="block space-y-1 text-sm">
                      <span className="text-[var(--muted)]">
                        {t("form.preferredTime")}
                      </span>
                      <input
                        type="time"
                        value={choice.preferredTime}
                        disabled={disabled}
                        onChange={(event) =>
                          patchChoice(item.id, {
                            preferredTime: event.target.value,
                          })
                        }
                        className="w-full cursor-pointer rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 outline-none"
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="mt-3 text-sm text-[var(--warn)]">{error}</p>
      ) : null}
      {remaining.length > 1 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => void addAll()}
          className="mt-6 inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconLabel icon={ListPlus} iconClassName="h-4 w-4">
            {busyId === "all"
              ? t("starters.adding")
              : t("starters.addAll", { count: remaining.length })}
          </IconLabel>
        </button>
      ) : null}
    </div>
  );
}
