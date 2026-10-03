import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { getAuthedUser } from "@/lib/auth/server";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    const user = await getAuthedUser();
    if (!user) {
      throw redirect({
        to: "/login",
        search: { callbackUrl: location.href, error: undefined },
      });
    }
    return { user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </>
  );
}
