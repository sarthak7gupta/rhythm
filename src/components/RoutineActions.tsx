import { useRouter } from "@tanstack/react-router";
import { Pause, Play, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconLabel } from "@/components/IconLabel";

export function RoutineActions({
  routineId,
  active,
}: {
  routineId: number;
  active: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    try {
      await fetch(`/api/routines/${routineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      await router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(t("actions.confirmDelete"))) return;
    setBusy(true);
    try {
      await fetch(`/api/routines/${routineId}`, { method: "DELETE" });
      await router.navigate({ to: "/routines" });
      await router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3 border-t border-[var(--line)] pt-6">
      <button
        type="button"
        disabled={busy}
        onClick={toggleActive}
        className="inline-flex cursor-pointer items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IconLabel icon={active ? Pause : Play} iconClassName="h-4 w-4">
          {active ? t("actions.pause") : t("actions.resume")}
        </IconLabel>
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={remove}
        className="inline-flex cursor-pointer items-center rounded-full px-4 py-2 text-sm text-[var(--warn)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IconLabel icon={Trash2} iconClassName="h-4 w-4">
          {t("actions.delete")}
        </IconLabel>
      </button>
    </div>
  );
}
