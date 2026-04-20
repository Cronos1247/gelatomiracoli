"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import type { Ingredient } from "@/lib/default-data";
import {
  defaultPricingSettings,
  readStoredJson,
  STORAGE_KEYS,
  writeStoredJson,
  type PricingSettings,
} from "@/lib/storage";
import type { IngredientPriceLookup } from "@/lib/economics";

type IngredientCostOverride = {
  ingredientId: string;
  ingredientName: string;
  costPerKg: number | null;
  currency: "USD" | "EUR";
};

type PantryCostRecord = {
  ingredient_id?: string | null;
  id?: string | null;
  name?: string | null;
  cost_per_kg?: number | null;
  user_cost_per_kg?: number | null;
  effective_cost_per_kg?: number | null;
  average_market_cost?: number | null;
  currency?: string | null;
  has_user_cost?: boolean | null;
};

function normalizeCostOverrides(
  ingredients: Ingredient[],
  overrides: IngredientCostOverride[],
  pricing: PricingSettings
) {
  const overrideMap = new Map(overrides.map((item) => [item.ingredientId, item]));

  return ingredients.map((ingredient) => {
    const override = overrideMap.get(ingredient.id);
    const averageMarketCost = Number(
      ingredient.average_market_cost ?? ingredient.cost_per_kg ?? 0
    );
    const userCostPerKg =
      override?.costPerKg === null || override?.costPerKg === undefined
        ? null
        : Number(override.costPerKg);
    const effectiveCostPerKg =
      pricing.costMode === "market_average"
        ? userCostPerKg ?? averageMarketCost
        : userCostPerKg ?? 0;

    return {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      category: ingredient.category,
      averageMarketCost,
      userCostPerKg,
      effectiveCostPerKg,
      currency: override?.currency ?? pricing.currency,
      hasUserCost: userCostPerKg !== null,
      warning:
        pricing.costMode === "custom" && userCostPerKg === null ? "Set Price" : null,
    };
  });
}

export function useIngredientCosts({
  ingredients,
}: {
  ingredients: Ingredient[];
}) {
  const [pricing, setPricingState] = useState<PricingSettings>(defaultPricingSettings);
  const [overrides, setOverrides] = useState<IngredientCostOverride[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedPricing = readStoredJson<PricingSettings>(
      STORAGE_KEYS.pricing,
      defaultPricingSettings
    );
    const storedOverrides = readStoredJson<IngredientCostOverride[]>(STORAGE_KEYS.pantry + "-costs", []);

    startTransition(() => {
      setPricing(storedPricing);
      setOverrides(storedOverrides);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    writeStoredJson(STORAGE_KEYS.pricing, pricing);
  }, [isReady, pricing]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    writeStoredJson(STORAGE_KEYS.pantry + "-costs", overrides);
  }, [isReady, overrides]);

  useEffect(() => {
    let cancelled = false;

    async function loadCosts() {
      const client = getBrowserSupabaseClient();

      if (!client) {
        return;
      }

      setLoading(true);
      setError(null);

      const viewResult = await client.from("pantry_with_costs").select("*").order("name");

      if (cancelled) {
        return;
      }

      if (viewResult.error) {
        setError(viewResult.error.message);
        setLoading(false);
        return;
      }

      const nextOverrides = (viewResult.data as PantryCostRecord[])
        .filter((row) => row.ingredient_id)
        .map((row) => ({
          ingredientId: String(row.ingredient_id),
          ingredientName: String(row.name ?? ""),
          costPerKg:
            row.user_cost_per_kg === null || row.user_cost_per_kg === undefined
              ? null
              : Number(row.user_cost_per_kg),
          currency: (row.currency === "EUR" ? "EUR" : "USD") as "USD" | "EUR",
        }));

      startTransition(() => {
        setOverrides(nextOverrides);
      });
      setLoading(false);
    }

    void loadCosts();

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(
    () => normalizeCostOverrides(ingredients, overrides, pricing),
    [ingredients, overrides, pricing]
  );

  const priceLookup = useMemo<IngredientPriceLookup>(
    () =>
      Object.fromEntries(
        rows.map((row) => [
          row.ingredientName,
          {
            ingredientId: row.ingredientId,
            userCostPerKg: row.userCostPerKg,
            averageMarketCost: row.averageMarketCost,
            effectiveCostPerKg: row.effectiveCostPerKg,
            currency: row.currency,
            hasUserCost: row.hasUserCost,
          },
        ])
      ),
    [rows]
  );

  const setPricing = (next: Partial<PricingSettings>) => {
    setPricingState((current) => ({
      ...current,
      ...next,
    }));
  };

  const setIngredientCost = async ({
    ingredient,
    costPerKg,
    currency = pricing.currency,
  }: {
    ingredient: Ingredient;
    costPerKg: number | null;
    currency?: "USD" | "EUR";
  }) => {
    setSavingId(ingredient.id);
    setError(null);

    const nextOverride: IngredientCostOverride = {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      costPerKg,
      currency,
    };

    setOverrides((current) => {
      const filtered = current.filter((item) => item.ingredientId !== ingredient.id);
      return [...filtered, nextOverride];
    });

    try {
      const response = await fetch("/api/pantry/costs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          costPerKg,
          currency,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to save ingredient cost.");
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save ingredient cost."
      );
    } finally {
      setSavingId(null);
    }
  };

  return {
    pricing,
    setPricing,
    rows,
    priceLookup,
    loading,
    savingId,
    error,
    setIngredientCost,
  };
}
