import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import i18n, { MOBILE_LANGUAGE_STORAGE_KEY, type MobileLanguage } from "./index";
import { getWebApiBaseUrl } from "../lib/config";

type MobileLanguageContextValue = {
  language: MobileLanguage;
  isHydrated: boolean;
  setLanguage: (language: MobileLanguage) => Promise<void>;
};

const MobileLanguageContext = createContext<MobileLanguageContextValue | null>(null);

async function syncLanguagePreference(language: MobileLanguage) {
  const baseUrl = getWebApiBaseUrl();

  if (!baseUrl) {
    return;
  }

  try {
    await fetch(`${baseUrl}/api/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        display_type: "Standard Case",
        language,
      }),
    });
  } catch {
    // Local persistence remains the source of truth when the laptop is offline.
  }
}

export function MobileLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<MobileLanguage>("en");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AsyncStorage.getItem(MOBILE_LANGUAGE_STORAGE_KEY)
      .then((stored) => {
        if (!mounted) {
          return;
        }

        if (stored === "en" || stored === "es" || stored === "it") {
          setLanguageState(stored);
          void i18n.changeLanguage(stored);
        }

        setIsHydrated(true);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setIsHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<MobileLanguageContextValue>(
    () => ({
      language,
      isHydrated,
      setLanguage: async (nextLanguage) => {
        setLanguageState(nextLanguage);
        await AsyncStorage.setItem(MOBILE_LANGUAGE_STORAGE_KEY, nextLanguage);
        await i18n.changeLanguage(nextLanguage);
        await syncLanguagePreference(nextLanguage);
      },
    }),
    [isHydrated, language]
  );

  return (
    <MobileLanguageContext.Provider value={value}>{children}</MobileLanguageContext.Provider>
  );
}

export function useMobileLanguage() {
  const context = useContext(MobileLanguageContext);

  if (!context) {
    throw new Error("useMobileLanguage must be used within MobileLanguageProvider");
  }

  return context;
}
