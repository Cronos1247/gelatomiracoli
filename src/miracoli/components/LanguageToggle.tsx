"use client";

import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type AppLanguage } from "@/lib/i18n";
import { useLanguage } from "@/src/miracoli/i18n/LanguageProvider";

const labels: Record<AppLanguage, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  it: "🇮🇹",
};

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em]">
      <span className="sr-only">{t("language")}</span>
      {SUPPORTED_LANGUAGES.map((option, index) => (
        <Fragment key={option}>
          <button
            type="button"
            onClick={() => void setLanguage(option)}
            className={`transition ${
              language === option
                ? "text-white"
                : "text-[#404040] hover:text-[var(--text-muted)]"
            }`}
          >
            {labels[option]}
          </button>
          {index < SUPPORTED_LANGUAGES.length - 1 ? (
            <span className="text-[#404040]">|</span>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
