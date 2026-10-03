import { Link, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconLabel } from "@/components/IconLabel";
import { TodayList } from "@/components/TodayList";
import { StarterPack } from "@/components/StarterPack";
import { loadTodayPage } from "@/lib/app-data";
import { getAuthedUser } from "@/lib/auth/server";

const loadToday = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getAuthedUser();
  if (!user?.id)
    return {
      nowIso: new Date().toISOString(),
      items: [],
      existingRoutines: [],
    };
  return loadTodayPage(user.id);
});

export const Route = createFileRoute("/_authed/today")({
  loader: () => loadToday(),
  component: TodayPage,
});

function TodayPage() {
  const { t } = useTranslation();
  const { nowIso, items, existingRoutines } = Route.useLoaderData();
  const now = new Date(nowIso);
  const pendingCount = items.filter(
    (item) => item.occurrence.status === "pending",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-[var(--muted)]">
            {format(now, "EEEE · MMM d")}
          </p>
          <h1 className="font-display text-4xl text-[var(--ink)]">
            {t("today.title")}
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            {pendingCount === 0
              ? t("today.allClear")
              : t("today.waiting", { count: pendingCount })}
          </p>
        </div>
        <Link
          to="/routines/new"
          className="inline-flex cursor-pointer items-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          <IconLabel icon={Plus} iconClassName="h-4 w-4">
            {t("today.new")}
          </IconLabel>
        </Link>
      </div>
      <TodayList initialItems={items} />
      <StarterPack existing={existingRoutines} />
    </div>
  );
}
