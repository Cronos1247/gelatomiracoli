"use client";

import { useLanguage } from "@/src/miracoli/i18n/LanguageProvider";

const OPTIONS = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
  { value: "it", label: "IT" },
] as const;

export function PortalLanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
      {OPTIONS.map((option) => {
        const active = language === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => void setLanguage(option.value)}
            className={`rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.24em] transition ${
              active ? "bg-white/12 text-white" : "text-white/55 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
