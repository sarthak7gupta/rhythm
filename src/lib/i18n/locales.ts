export const locales = ["en", "fr", "es", "de", "it", "pt"] as const;

export type AppLocale = (typeof locales)[number];

export const LOCALE_STORAGE_KEY = "rhythm.locale.v2";

export const localeNames: Record<AppLocale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
};

export function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}

export function readStoredLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "en";
  }
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && isAppLocale(stored)) {
    return stored;
  }
  return "en";
}

export function persistLocale(locale: AppLocale): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}
