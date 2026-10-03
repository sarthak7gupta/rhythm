import { Link, useRouterState } from "@tanstack/react-router";
import { ListTodo, LogOut, Settings, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconLabel } from "@/components/IconLabel";

const links = [
  { to: "/today" as const, labelKey: "nav.today", icon: Sun },
  { to: "/routines" as const, labelKey: "nav.routines", icon: ListTodo },
  { to: "/settings" as const, labelKey: "nav.settings", icon: Settings },
];

export function AppNav() {
  const { t } = useTranslation();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  async function signOut() {
    const csrfRes = await fetch("/api/auth/csrf");
    const csrf = await csrfRes.json();
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken: csrf.csrfToken ?? "",
        callbackUrl: "/login",
        json: "true",
      }),
    });
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3 pr-14">
        <Link
          to="/today"
          className="font-display text-2xl tracking-tight text-[var(--ink)]"
        >
          {t("app.name")}
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active =
              pathname === link.to || pathname.startsWith(`${link.to}/`);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`inline-flex cursor-pointer items-center rounded-full px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                <IconLabel icon={link.icon}>{t(link.labelKey)}</IconLabel>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => void signOut()}
            className="ml-1 inline-flex cursor-pointer items-center rounded-full px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <IconLabel icon={LogOut}>{t("nav.signOut")}</IconLabel>
          </button>
        </nav>
      </div>
    </header>
  );
}
