"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useTranslation } from "react-i18next";
import { RecipePdfSheet } from "@/components/RecipePdfSheet";
import { useIngredientCosts } from "@/hooks/useIngredientCosts";
import type { Ingredient } from "@/lib/default-data";
import { getDateLocale, translateIngredientLabel } from "@/lib/i18n";
import {
  readStoredJson,
  STORAGE_KEYS,
  type RecipeBookEntry,
  type StudioSnapshot,
} from "@/lib/storage";
import { useCalculatedEconomics } from "@/src/miracoli/engine";
import { useLanguage } from "@/src/miracoli/i18n/LanguageProvider";

type RecipeDetailViewProps = {
  recipeId: string;
  ingredients: Ingredient[];
};

const formatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const fallbackStudio: StudioSnapshot = {
  labName: "Miracoli Lab",
  logoUrl: null,
};

function formatMetric(value: number, suffix = "") {
  return `${formatter.format(value)}${suffix}`;
}

export function RecipeDetailView({ recipeId, ingredients }: RecipeDetailViewProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [recipe, setRecipe] = useState<RecipeBookEntry | null>(null);
  const [studio, setStudio] = useState<StudioSnapshot>(fallbackStudio);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const { pricing, priceLookup } = useIngredientCosts({ ingredients });

  useEffect(() => {
    const recipes = readStoredJson<RecipeBookEntry[]>(STORAGE_KEYS.recipeBook, []);
    const savedStudio = readStoredJson<StudioSnapshot>(STORAGE_KEYS.studio, fallbackStudio);

    startTransition(() => {
      setRecipe(recipes.find((entry) => entry.id === recipeId) ?? null);
      setStudio(savedStudio);
      setIsLoaded(true);
    });
  }, [recipeId]);
  const economics = useCalculatedEconomics({
    recipe,
    priceLookup,
    pricing,
  });
  const liveRecipe = recipe
    ? {
        ...recipe,
        ingredients: economics?.ingredients ?? recipe.ingredients,
        metrics: economics?.metrics ?? recipe.metrics,
      }
    : null;
  const currencyPrefix = liveRecipe?.metrics.currency === "EUR" ? "EUR " : "$";
  const dateFormatter = new Intl.DateTimeFormat(getDateLocale(language), {
    dateStyle: "medium",
  });

  const exportRecipe = async () => {
    if (!liveRecipe || !exportRef.current) {
      return;
    }

    setIsExporting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 80));

    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#f8f1e2",
        scale: 2,
      });
      const image = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const width = canvas.width * ratio;
      const height = canvas.height * ratio;
      const marginX = (pageWidth - width) / 2;

      pdf.addImage(image, "PNG", marginX, 10, width, height);
      pdf.save(`${liveRecipe.recipeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isLoaded) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-4 px-4 py-6 text-center sm:px-6">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">Recipe Detail</p>
        
        <h1 className="font-serif text-4xl text-[var(--accent)]">Loading recipe</h1>
      </main>
    );
  }

  if (!liveRecipe) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-4 px-4 py-6 text-center sm:px-6">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">Recipe Detail</p>
        <h1 className="font-serif text-4xl text-[var(--accent)]">Recipe not found</h1>
        <p className="max-w-xl text-sm leading-7 text-[var(--text-muted)]">
          This recipe is no longer in the local recipe book. Save it again from the lab to restore
          the premium detail view.
        </p>
        <Link
          href="/"
          className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b1612]"
        >
          Return To Lab
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
      <section className="luxury-card rounded-[34px] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">
              Recipe Detail
            </p>
            <h1 className="font-serif text-4xl tracking-[-0.04em] text-[var(--accent)] sm:text-5xl">
              {liveRecipe.recipeName}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {studio.labName} | {dateFormatter.format(new Date(liveRecipe.createdAt))}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-[var(--accent-border)] px-5 py-3 text-sm"
            >
              Back To Lab
            </Link>
            <button
              type="button"
              onClick={exportRecipe}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b1612]"
            >
              {isExporting ? "Preparing PDF" : t("printToPdf")}
            </button>
          </div>
        </div>
      </section>

      <section className="formula-grid">
        <article className="luxury-card rounded-[30px] p-6 sm:p-7">
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
            Twin-View
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Production vs Physics</h2>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-[var(--accent-border)] bg-black/10">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--accent-border)] text-[var(--text-muted)]">
                  <th className="px-4 py-4 font-medium uppercase tracking-[0.2em]">{t("production")}</th>
                  <th className="px-4 py-4 font-medium uppercase tracking-[0.2em]">{t("physics")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--accent-border)] align-top">
                  <td className="px-4 py-4">
                    <div className="space-y-3">
                      {liveRecipe.ingredients.map((ingredient) => (
                        <div
                          key={ingredient.name}
                          className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--accent-border)] bg-[rgba(255,255,255,0.02)] px-3 py-2"
                        >
                          <span>{translateIngredientLabel(ingredient.name, language)}</span>
                          <span className="text-[var(--text-muted)]">
                            {formatMetric(ingredient.grams)}g
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(212,175,55,0.28)] bg-[rgba(212,175,55,0.08)] px-3 py-2 font-semibold">
                        <span>{t("totalWeight")}</span>
                        <span>{formatMetric(liveRecipe.totalMixWeight, "g")}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-3">
                      {[
                        [t("finalVolume"), formatMetric(liveRecipe.estimatedVolumeLiters, "L")],
                        ["PAC", formatMetric(liveRecipe.metrics.pac)],
                        ["POD", formatMetric(liveRecipe.metrics.podPct, "%")],
                        [t("totalSolids"), formatMetric(liveRecipe.metrics.solidsPct, "%")],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--accent-border)] bg-[rgba(255,255,255,0.02)] px-3 py-3"
                        >
                          <span>{label}</span>
                          <span className="metric-value text-lg font-semibold">{value}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article className="luxury-card rounded-[30px] p-6 sm:p-7">
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
            Margin Sheet
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Service economics</h2>

          <div className="mt-6 space-y-4">
            {[
              ["Total Batch Cost", `${currencyPrefix}${formatMetric(liveRecipe.metrics.totalBatchCost)}`],
              ["Cost / Kg", `${currencyPrefix}${formatMetric(liveRecipe.metrics.costPerKg)}`],
              ["Cost / Liter", `${currencyPrefix}${formatMetric(liveRecipe.metrics.costPerLiter)}`],
              ["Suggested Pint", `${currencyPrefix}${formatMetric(liveRecipe.metrics.suggestedRetailPerPint)}`],
              ["Estimated Margin", formatMetric(liveRecipe.metrics.estimatedMarginPct, "%")],
              ["Overrun", formatMetric(liveRecipe.overrunPct, "%")],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[22px] border border-[var(--accent-border)] bg-black/10 p-4"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  {label}
                </p>
                <p className="metric-value mt-3 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4 text-sm text-[var(--text-muted)]">
            <div className="space-y-3">
              {liveRecipe.fixedIngredientNotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </div>
        </article>
      </section>

      <div className="pointer-events-none fixed left-[-9999px] top-0 z-50 w-[900px]" aria-hidden="true">
        <div ref={exportRef}>
          <RecipePdfSheet
            recipe={liveRecipe}
            labName={studio.labName}
            logoUrl={studio.logoUrl}
            activeLanguage={language}
            dateFormatter={dateFormatter}
            formatMetric={formatMetric}
          />
        </div>
      </div>
    </main>
  );
}
