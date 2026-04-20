"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { type i18n as I18nInstance } from "i18next";
import {
  AppLanguage,
  getDateLocale,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  translationResources,
} from "@/lib/i18n";
import { syncLanguagePreference } from "@/lib/miracoli-sync";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  dateLocale: string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getStoredLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return "en";
  }

  const candidate = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return SUPPORTED_LANGUAGES.includes(candidate as AppLanguage) ? (candidate as AppLanguage) : "en";
}

let i18nInstance: I18nInstance | null = null;

function getI18nInstance() {
  if (i18nInstance) {
    return i18nInstance;
  }

  i18nInstance = i18n.createInstance();
  void i18nInstance.init({
    resources: translationResources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

  return i18nInstance;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => getStoredLanguage());
  const i18nClient = useMemo(() => getI18nInstance(), []);

  useEffect(() => {
    void i18nClient.changeLanguage(language);
  }, [i18nClient, language]);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    void i18nClient.changeLanguage(nextLanguage);

    try {
      await syncLanguagePreference(nextLanguage);
    } catch {
      // Keep language switching instant even when remote persistence is unavailable.
    }
  }, [i18nClient]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      dateLocale: getDateLocale(language),
    }),
    [language, setLanguage]
  );

  return (
    <I18nextProvider i18n={i18nClient}>
      <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
    </I18nextProvider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}
