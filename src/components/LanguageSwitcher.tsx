import { Globe } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  changeAppLocale,
  localeNames,
  locales,
  type AppLocale,
} from "@/lib/i18n";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const resolved = i18n.resolvedLanguage ?? i18n.language;
  const current = (locales as readonly string[]).includes(resolved)
    ? (resolved as AppLocale)
    : "en";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="fixed top-3 right-3 z-40">
      <button
        type="button"
        aria-label={t("settings.language")}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]/40"
      >
        <Globe className="h-5 w-5" aria-hidden />
      </button>
      {open ? (
        <ul
          id={menuId}
          aria-label={t("settings.language")}
          className="absolute right-0 mt-2 min-w-40 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-1 shadow-lg"
        >
          {locales.map((locale) => {
            const selected = locale === current;
            return (
              <li key={locale}>
                <button
                  type="button"
                  onClick={() => {
                    void changeAppLocale(locale);
                    setOpen(false);
                  }}
                  className={`block w-full cursor-pointer px-4 py-2 text-left text-sm ${
                    selected
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--ink)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  {localeNames[locale]}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
