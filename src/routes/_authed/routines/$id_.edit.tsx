import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { RoutineForm } from "@/components/RoutineForm";
import { loadRoutineDetail } from "@/lib/app-data";
import { getAuthedUser } from "@/lib/auth/server";

const loadEdit = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const user = await getAuthedUser();
    if (!user?.id) return null;
    return loadRoutineDetail(user.id, data);
  });

export const Route = createFileRoute("/_authed/routines/$id_/edit")({
  loader: async ({ params }) => {
    const data = await loadEdit({ data: params.id });
    if (!data) throw notFound();
    return data.routine;
  },
  component: EditRoutinePage,
});

function EditRoutinePage() {
  const { t } = useTranslation();
  const routine = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/routines/$id"
          params={{ id: String(routine.id) }}
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          {t("routines.backGeneric")}
        </Link>
        <h1 className="mt-2 font-display text-4xl text-[var(--ink)]">
          {t("routines.editTitle")}
        </h1>
      </div>
      <RoutineForm
        mode="edit"
        routineId={routine.id}
        initial={{
          title: routine.title,
          notes: routine.notes ?? "",
          category: routine.category,
          rruleKind: routine.rruleKind,
          intervalDays: routine.intervalDays ?? 7,
          weekday: routine.weekday ?? 0,
          monthDay: routine.monthDay ?? 1,
          preferredTime: routine.preferredTime ?? "",
          timezone: routine.timezone,
          active: routine.active,
        }}
      />
    </div>
  );
}
