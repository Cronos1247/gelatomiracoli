"use client";

import { useMemo } from "react";
import { applyEconomicsToRecipe, type IngredientPriceLookup } from "@/lib/economics";
import type { BalancedRecipe } from "@/lib/balance-gelato";
import type { PricingSettings } from "@/lib/storage";

export function useCalculatedEconomics({
  recipe,
  priceLookup,
  pricing,
}: {
  recipe: BalancedRecipe | null;
  priceLookup?: IngredientPriceLookup;
  pricing: PricingSettings;
}) {
  return useMemo(() => {
    if (!recipe) {
      return null;
    }

    return applyEconomicsToRecipe({
      recipe,
      priceLookup,
      pricing,
    });
  }, [priceLookup, pricing, recipe]);
}
