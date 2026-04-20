import Link from "next/link";
import { MetricCard } from "@/components/GelatoPrimitives";
import { type RecipeBookEntry } from "@/lib/storage";

type RecipeBookSectionProps = {
  recipes: RecipeBookEntry[];
  search: string;
  onSearchChange: (value: string) => void;
  onExport: (recipe: RecipeBookEntry) => void;
  onDelete: (id: string) => void;
  onScale: (recipe: RecipeBookEntry) => void;
  formatMetric: (value: number, suffix?: string) => string;
  dateFormatter: Intl.DateTimeFormat;
};

export function RecipeBookSection({
  recipes,
  search,
  onSearchChange,
  onExport,
  onDelete,
  onScale,
  formatMetric,
  dateFormatter,
}: RecipeBookSectionProps) {
  return (
    <section id="recipe-book" className="luxury-card rounded-[30px] p-6 sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
            Recipe Book
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            Export-ready archive
          </h2>
        </div>
        <input
          placeholder="Search recipe book"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none transition focus:border-[rgba(212,175,55,0.34)] sm:w-72"
        />
      </div>

      <div className="recipe-grid">
        {recipes.length ? (
          recipes.map((recipe) => (
            <article key={recipe.id} className="luxury-card rounded-[26px] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    {dateFormatter.format(new Date(recipe.createdAt))}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                    {recipe.recipeName}
                  </h3>
                </div>
                <div className="gold-chip rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
                  {recipe.baseType}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <MetricCard label="Weight" value={formatMetric(recipe.totalMixWeight, "g")} />
                <MetricCard label="Volume" value={formatMetric(recipe.estimatedVolumeLiters, "L")} />
                <MetricCard
                  label="Batch Cost"
                  value={`${recipe.metrics.currency === "EUR" ? "EUR " : "$"}${formatMetric(recipe.metrics.totalBatchCost)}`}
                />
                <MetricCard
                  label="Cost / L"
                  value={`${recipe.metrics.currency === "EUR" ? "EUR " : "$"}${formatMetric(recipe.metrics.costPerLiter)}`}
                />
                <MetricCard
                  label="Margin"
                  value={formatMetric(recipe.metrics.estimatedMarginPct, "%")}
                />
              </div>

              <div className="mt-5 flex gap-2">
                <Link
                  href={`/recipe/${recipe.id}`}
                  className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm transition hover:border-[rgba(212,175,55,0.3)]"
                >
                  View Detail
                </Link>
                <button
                  type="button"
                  onClick={() => onScale(recipe)}
                  className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm transition hover:border-[rgba(212,175,55,0.3)]"
                >
                  Scale Batch
                </button>
                <button
                  type="button"
                  onClick={() => onExport(recipe)}
                  className="flex-1 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#1b1612] transition hover:brightness-105"
                >
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(recipe.id)}
                  className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm transition hover:border-[rgba(212,175,55,0.3)]"
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="luxury-card rounded-[26px] p-5 text-sm text-[var(--text-muted)]">
            Save a rebalanced recipe to start the archive.
          </article>
        )}
      </div>
    </section>
  );
}
