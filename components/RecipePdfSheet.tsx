"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { translateIngredientLabel, type AppLanguage } from "@/lib/i18n";
import type { RecipeBookEntry } from "@/lib/storage";

type RecipePdfSheetProps = {
  recipe: RecipeBookEntry;
  labName: string;
  logoUrl: string | null;
  activeLanguage: AppLanguage;
  dateFormatter: Intl.DateTimeFormat;
  formatMetric: (value: number, suffix?: string) => string;
};

export function RecipePdfSheet({
  recipe,
  labName,
  logoUrl,
  activeLanguage,
  dateFormatter,
  formatMetric,
}: RecipePdfSheetProps) {
  const { t } = useTranslation();
  const currencyPrefix = recipe.metrics.currency === "EUR" ? "EUR " : "$";

  return (
    <div className="rounded-[24px] border border-[#d4af37]/20 bg-[#f8f1e2] p-10 text-[#2f251d]">
      <div className="mb-8 flex items-start justify-between gap-8">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#8c6e2d]">{labName}</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">{recipe.recipeName}</h2>
          <p className="mt-3 text-sm text-[#5c4a3a]">
            {t("date")} {dateFormatter.format(new Date(recipe.createdAt))}
          </p>
        </div>
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[20px] border border-[#d4af37]/35 bg-[#fff8ec] text-center text-xs uppercase tracking-[0.24em] text-[#8c6e2d]">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="User logo"
              width={96}
              height={96}
              className="h-full w-full object-cover"
            />
          ) : (
            <>User Logo</>
          )}
        </div>
      </div>
      <div className="grid grid-cols-[1.1fr_0.9fr] gap-8">
        <div>
          <h3 className="mb-4 text-sm uppercase tracking-[0.26em] text-[#8c6e2d]">
            {t("ingredientList")}
          </h3>
          <div className="overflow-hidden rounded-[20px] border border-[#d4af37]/20">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#efe0b1]/40 text-[#6f5734]">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("ingredient")}</th>
                  <th className="px-4 py-3 font-medium">{t("grams")}</th>
                  <th className="px-4 py-3 font-medium">{t("percentage")}</th>
                  <th className="px-4 py-3 font-medium">{t("costPerKg")}</th>
                </tr>
              </thead>
              <tbody>
                {recipe.ingredients.map((ingredient) => (
                  <tr key={ingredient.name} className="border-t border-[#d4af37]/14">
                    <td className="px-4 py-3">{translateIngredientLabel(ingredient.name, activeLanguage)}</td>
                    <td className="px-4 py-3">{formatMetric(ingredient.grams)}g</td>
                    <td className="px-4 py-3">{formatMetric(ingredient.percentage, "%")}</td>
                    <td className="px-4 py-3">{currencyPrefix}{formatMetric(ingredient.costPerKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-[20px] border border-[#d4af37]/20 bg-white/40 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8c6e2d]">{t("weight")}</p>
            <p className="mt-3 text-2xl font-semibold">{formatMetric(recipe.totalMixWeight, "g")}</p>
          </div>
          <div className="rounded-[20px] border border-[#d4af37]/20 bg-white/40 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8c6e2d]">{t("volume")}</p>
            <p className="mt-3 text-2xl font-semibold">
              {formatMetric(recipe.estimatedVolumeLiters, "L")}
            </p>
          </div>
          <div className="rounded-[20px] border border-[#d4af37]/20 bg-white/40 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8c6e2d]">{t("batchCost")}</p>
            <p className="mt-3 text-2xl font-semibold">
              {currencyPrefix}{formatMetric(recipe.metrics.totalBatchCost)}
            </p>
          </div>
          <div className="rounded-[20px] border border-[#d4af37]/20 bg-white/40 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8c6e2d]">{t("costPerLiter")}</p>
            <p className="mt-3 text-2xl font-semibold">
              {currencyPrefix}{formatMetric(recipe.metrics.costPerLiter)}
            </p>
          </div>
          <div className="rounded-[20px] border border-[#d4af37]/20 bg-white/40 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8c6e2d]">{t("suggestedPint")}</p>
            <p className="mt-3 text-2xl font-semibold">
              {currencyPrefix}{formatMetric(recipe.metrics.suggestedRetailPerPint)}
            </p>
          </div>
          <div className="rounded-[20px] border border-[#d4af37]/20 bg-white/40 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8c6e2d]">{t("margin")}</p>
            <p className="mt-3 text-2xl font-semibold">
              {formatMetric(recipe.metrics.estimatedMarginPct, "%")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
