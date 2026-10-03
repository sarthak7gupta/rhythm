import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import de from "./de.json";
import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import it from "./it.json";
import pt from "./pt.json";
import { persistLocale, readStoredLocale, type AppLocale } from "./locales";

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
    de: { translation: de },
    it: { translation: it },
    pt: { translation: pt },
  },
  lng: "en",
  fallbackLng: "en",
  supportedLngs: ["en", "fr", "es", "de", "it", "pt"],
  interpolation: { escapeValue: false },
});

export async function changeAppLocale(locale: AppLocale) {
  persistLocale(locale);
  await i18n.changeLanguage(locale);
}

export function hydrateAppLocale() {
  const stored = readStoredLocale();
  persistLocale(stored);
  if (i18n.language !== stored) {
    void i18n.changeLanguage(stored);
  }
}

export { i18n };
export { locales, localeNames, type AppLocale } from "./locales";
