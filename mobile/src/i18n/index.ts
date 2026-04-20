import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../../../lib/translations/en.json";
import es from "../../../lib/translations/es.json";
import it from "../../../lib/translations/it.json";

export const SUPPORTED_LANGUAGES = ["en", "es", "it"] as const;
export type MobileLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const MOBILE_LANGUAGE_STORAGE_KEY = "gelato-miracoli-mobile-language";

export const mobileResources = {
  en: { translation: en },
  es: { translation: es },
  it: { translation: it },
} as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: mobileResources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
