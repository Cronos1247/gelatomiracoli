"use client";

import type { Ingredient } from "@/lib/default-data";
import type { PricingSettings } from "@/lib/storage";

type PriceRow = {
  ingredientId: string;
  ingredientName: string;
  category: string;
  averageMarketCost: number;
  userCostPerKg: number | null;
  effectiveCostPerKg: number;
  currency: "USD" | "EUR";
  hasUserCost: boolean;
  warning: string | null;
};

type PriceManagementViewProps = {
  ingredients: Ingredient[];
  pricing: PricingSettings;
  rows: PriceRow[];
  savingId: string | null;
  loading: boolean;
  error: string | null;
  onPricingChange: (next: Partial<PricingSettings>) => void;
  onCostChange: (ingredient: Ingredient, costPerKg: number | null) => void;
};

export function PriceManagementView({
  ingredients,
  pricing,
  rows,
  savingId,
  loading,
  error,
  onPricingChange,
  onCostChange,
}: PriceManagementViewProps) {
  return (
    <section className="luxury-card rounded-[30px] p-6 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
            Price Management
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            Pantry price list
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">
            Master pantry data defines the physics. This sheet defines your economics. Update a
            price here and every saved recipe recalculates its batch cost immediately.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onPricingChange({ costMode: "market_average" })}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              pricing.costMode === "market_average"
                ? "border-[rgba(212,175,55,0.34)] bg-[rgba(212,175,55,0.12)]"
                : "border-[var(--accent-border)] bg-black/10"
            }`}
          >
            Use Market Averages
          </button>
          <button
            type="button"
            onClick={() => onPricingChange({ costMode: "custom" })}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              pricing.costMode === "custom"
                ? "border-[rgba(212,175,55,0.34)] bg-[rgba(212,175,55,0.12)]"
                : "border-[var(--accent-border)] bg-black/10"
            }`}
          >
            Use My Custom Costs
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Currency
          </span>
          <select
            value={pricing.currency}
            onChange={(event) =>
              onPricingChange({ currency: event.target.value === "EUR" ? "EUR" : "USD" })
            }
            className="rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
          >
            <option value="USD" className="bg-[#1a1614]">
              USD
            </option>
            <option value="EUR" className="bg-[#1a1614]">
              EUR
            </option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Target Margin %
          </span>
          <input
            type="number"
            min={10}
            max={95}
            step={1}
            value={pricing.targetMarginPct}
            onChange={(event) =>
              onPricingChange({ targetMarginPct: Number(event.target.value) || 75 })
            }
            className="rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Retail / Liter
          </span>
          <input
            type="number"
            min={1}
            step={0.5}
            value={pricing.retailPricePerLiter}
            onChange={(event) =>
              onPricingChange({ retailPricePerLiter: Number(event.target.value) || 28 })
            }
            className="rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
          />
        </label>
        <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Price Source
          </p>
          <p className="mt-3 text-lg font-semibold text-[var(--accent)]">
            {pricing.costMode === "market_average" ? "Market Avg + Overrides" : "Custom Only"}
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {pricing.costMode === "market_average"
              ? "Ingredients without a personal override will use the master market placeholder."
              : "Ingredients without a personal override will warn as Set Price."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4 text-sm text-[var(--text-muted)]">
          Loading pantry prices...
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-[24px] border border-[rgba(255,140,111,0.28)] bg-[rgba(255,140,111,0.08)] p-4 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-[26px] border border-[var(--accent-border)] bg-black/10">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[rgba(212,175,55,0.08)] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-4 font-medium uppercase tracking-[0.18em]">Ingredient</th>
              <th className="px-4 py-4 font-medium uppercase tracking-[0.18em]">Category</th>
              <th className="px-4 py-4 font-medium uppercase tracking-[0.18em]">Market Avg</th>
              <th className="px-4 py-4 font-medium uppercase tracking-[0.18em]">My Price</th>
              <th className="px-4 py-4 font-medium uppercase tracking-[0.18em]">Effective</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const ingredient = ingredients.find((item) => item.id === row.ingredientId);

              if (!ingredient) {
                return null;
              }

              return (
                <tr key={row.ingredientId} className="border-t border-[var(--accent-border)]">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium">{row.ingredientName}</p>
                      {row.warning ? (
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--danger)]">
                          {row.warning}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[var(--text-muted)]">{row.category}</td>
                  <td className="px-4 py-4">
                    {pricing.currency === "USD" ? "$" : "EUR "}
                    {row.averageMarketCost.toFixed(2)}
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.userCostPerKg ?? ""}
                      placeholder="Set Price"
                      onChange={(event) =>
                        onCostChange(
                          ingredient,
                          event.target.value === "" ? null : Number(event.target.value)
                        )
                      }
                      className="w-28 rounded-xl border border-[rgba(212,175,55,0.24)] bg-[rgba(255,255,255,0.02)] px-3 py-2 outline-none"
                    />
                    {savingId === row.ingredientId ? (
                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
                        Saving
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 font-medium text-[var(--accent)]">
                    {pricing.currency === "USD" ? "$" : "EUR "}
                    {row.effectiveCostPerKg.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
