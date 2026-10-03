import type { ReactNode } from "react";
import { useEffect } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { I18nextProvider, useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { hydrateAppLocale, i18n } from "@/lib/i18n";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: i18n.t("app.name") },
      {
        name: "description",
        content: i18n.t("app.description"),
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/icon.svg" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Source+Sans+3:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function NotFound() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-center">
      <h1 className="font-display text-4xl">{t("notFound.title")}</h1>
      <p className="mt-2 text-[var(--muted)]">{t("notFound.body")}</p>
    </main>
  );
}

function RootComponent() {
  return (
    <I18nextProvider i18n={i18n}>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </I18nextProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  const { i18n: i18nInstance } = useTranslation();

  useEffect(() => {
    hydrateAppLocale();
  }, []);

  return (
    <html
      lang={i18nInstance.resolvedLanguage ?? "en"}
      className="h-full antialiased"
    >
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <LanguageSwitcher />
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
