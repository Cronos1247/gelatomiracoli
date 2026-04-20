import type { BalancedIngredient, BalancedMetrics, BalancedRecipe } from "@/lib/balance-gelato";
import type { Ingredient } from "@/lib/default-data";
import type { CostMode, PricingSettings } from "@/lib/storage";

export type IngredientPriceLookupEntry = {
  ingredientId?: string | null;
  userCostPerKg: number | null;
  averageMarketCost: number;
  effectiveCostPerKg: number;
  currency: string;
  hasUserCost: boolean;
};

export type IngredientPriceLookup = Record<string, IngredientPriceLookupEntry>;

export type RecipeEconomics = {
  ingredients: BalancedIngredient[];
  metrics: BalancedMetrics;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function resolveIngredientCost({
  ingredient,
  priceLookup,
  costMode,
}: {
  ingredient: Pick<Ingredient, "name" | "id" | "average_market_cost" | "cost_per_kg">;
  priceLookup?: IngredientPriceLookup;
  costMode: CostMode;
}) {
  const byName = priceLookup?.[ingredient.name];
  const averageMarketCost = round2(
    byName?.averageMarketCost ??
      ingredient.average_market_cost ??
      ingredient.cost_per_kg ??
      0
  );
  const userCostPerKg =
    byName?.userCostPerKg === null || byName?.userCostPerKg === undefined
      ? null
      : round2(byName.userCostPerKg);
  const effectiveCostPerKg = round2(
    costMode === "market_average"
      ? userCostPerKg ?? averageMarketCost
      : userCostPerKg ?? 0
  );

  return {
    userCostPerKg,
    averageMarketCost,
    effectiveCostPerKg,
    currency: byName?.currency ?? "USD",
    hasUserCost: Boolean(byName?.hasUserCost ?? userCostPerKg !== null),
  };
}

export function calculateEconomics({
  ingredients,
  estimatedVolumeLiters,
  densityKgPerL,
  priceLookup,
  pricing,
}: {
  ingredients: Array<
    Pick<BalancedIngredient, "name" | "grams" | "percentage"> & {
      costPerKg?: number;
      totalCost?: number;
    }
  >;
  estimatedVolumeLiters: number;
  densityKgPerL: number;
  priceLookup?: IngredientPriceLookup;
  pricing: PricingSettings;
}) {
  const recostedIngredients = ingredients.map((ingredient) => {
    const resolved = priceLookup?.[ingredient.name];
    const costPerKg = round2(resolved?.effectiveCostPerKg ?? ingredient.costPerKg ?? 0);

    return {
      ...ingredient,
      costPerKg,
      totalCost: round2((ingredient.grams / 1000) * costPerKg),
    };
  });
  const totalBatchCost = round2(
    recostedIngredients.reduce((sum, ingredient) => sum + ingredient.totalCost, 0)
  );
  const totalMixWeight = recostedIngredients.reduce((sum, ingredient) => sum + ingredient.grams, 0);
  const safeVolume = Math.max(estimatedVolumeLiters, 0.01);
  const safeMargin = Math.min(Math.max(pricing.targetMarginPct, 1), 95) / 100;
  const costPerKg = round2((totalBatchCost / Math.max(totalMixWeight, 1)) * 1000);
  const costPerLiter = round2(totalBatchCost / safeVolume);
  const suggestedRetailPerLiter = round2(costPerLiter / (1 - safeMargin));
  const suggestedRetailPerPint = round2(suggestedRetailPerLiter * pricing.pintVolumeLiters);
  const suggestedRetailPerScoop = round2(
    suggestedRetailPerLiter * ((pricing.scoopSizeGrams / 1000) / Math.max(densityKgPerL, 0.01))
  );
  const estimatedMarginPct = round2(
    ((pricing.retailPricePerLiter - costPerLiter) / Math.max(pricing.retailPricePerLiter, 0.01)) *
      100
  );

  return {
    ingredients: recostedIngredients,
    metrics: {
      totalBatchCost,
      costPerKg,
      costPerLiter,
      estimatedMarginPct,
      suggestedRetailPerLiter,
      suggestedRetailPerPint,
      suggestedRetailPerScoop,
      currency: pricing.currency,
    },
  };
}

export function applyEconomicsToRecipe({
  recipe,
  priceLookup,
  pricing,
}: {
  recipe: BalancedRecipe;
  priceLookup?: IngredientPriceLookup;
  pricing: PricingSettings;
}): RecipeEconomics {
  const economics = calculateEconomics({
    ingredients: recipe.ingredients,
    estimatedVolumeLiters: recipe.estimatedVolumeLiters,
    densityKgPerL: recipe.metrics.densityKgPerL,
    priceLookup,
    pricing,
  });

  return {
    ingredients: economics.ingredients,
    metrics: {
      ...recipe.metrics,
      ...economics.metrics,
    },
  };
}
