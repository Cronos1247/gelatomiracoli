"use client";

import { useMemo, useState } from "react";
import {
  balanceGelato,
  type BalanceGelatoOptions,
  type BalancedRecipe,
  type BalancedWarning,
} from "@/lib/balance-gelato";
import { flavorProfiles, type FlavorKey, type Ingredient } from "@/lib/default-data";
import { resolveFlavorArchetype } from "@/lib/template-engine";

type UseReactiveBalancerOptions = Omit<
  BalanceGelatoOptions,
  "intensity" | "flavorProfile"
> & {
  ingredientLibrary: Ingredient[];
  flavorProfile: FlavorKey;
};

type ReactiveFlavorRow = {
  name: string;
  gramsPerKg: number;
  recommendedGramsPerKg: number | null;
  hint: string | null;
};

type ReactiveBalancerResult = {
  flavorIntensity: number;
  setFlavorIntensity: (value: number) => void;
  recipe: BalancedRecipe | null;
  error: string | null;
  textureAlert: boolean;
  flavorRow: ReactiveFlavorRow;
};

function buildTextureWarning(recipe: BalancedRecipe): BalancedWarning {
  const messages: string[] = [];

  if (recipe.metrics.solidsPct > 42) {
    messages.push(`total solids are ${recipe.metrics.solidsPct.toFixed(2)}%`);
  }

  if (recipe.metrics.fatPct > 16) {
    messages.push(`fat is ${recipe.metrics.fatPct.toFixed(2)}%`);
  }

  return {
    title: "Texture Alert",
    message: `Flavor intensity is pushing structure too far: ${messages.join(
      " and "
    )}. Pull intensity back or open more dairy/water space.`,
  };
}

function findFlavorIngredient(
  ingredientLibrary: Ingredient[],
  flavorKey: FlavorKey
) {
  const profile = resolveFlavorArchetype(flavorProfiles[flavorKey], ingredientLibrary);
  const firstFixedIngredient = profile.fixedIngredients[0];

  if (!firstFixedIngredient) {
    return null;
  }

  const searchTerms = new Set(
    `${firstFixedIngredient.name} ${profile.label}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length >= 4)
      .map((term) =>
        term.startsWith("pistac")
          ? "pistac"
          : term.startsWith("chocol")
            ? "chocol"
            : term.startsWith("hazeln")
              ? "hazeln"
              : term
      )
  );

  return (
    ingredientLibrary.find((ingredient) => {
      const haystack = ingredient.name.toLowerCase();

      return [...searchTerms].some((term) => haystack.includes(term));
    }) ?? null
  );
}

export function useReactiveBalancer({
  ingredientLibrary,
  flavorProfile,
  ...options
}: UseReactiveBalancerOptions): ReactiveBalancerResult {
  const [flavorIntensity, setFlavorIntensity] = useState(100);
  const intensityScale = flavorIntensity / 100;

  const profile = useMemo(
    () => resolveFlavorArchetype(flavorProfiles[flavorProfile], ingredientLibrary),
    [flavorProfile, ingredientLibrary]
  );
  const matchedFlavorIngredient = useMemo(
    () => findFlavorIngredient(ingredientLibrary, flavorProfile),
    [flavorProfile, ingredientLibrary]
  );

  const flavorRow = useMemo(() => {
    const leadIngredient = profile.fixedIngredients[0];
    const recommendedGramsPerKg =
      matchedFlavorIngredient?.dosage_guideline ?? leadIngredient?.grams_per_kg_mix ?? null;
    const activeDose = recommendedGramsPerKg
      ? recommendedGramsPerKg * intensityScale
      : (leadIngredient?.grams_per_kg_mix ?? 0) * intensityScale;

    return {
      name: matchedFlavorIngredient?.name ?? leadIngredient?.name ?? profile.label,
      gramsPerKg: activeDose,
      recommendedGramsPerKg,
      hint: recommendedGramsPerKg
        ? `Recommended: ${recommendedGramsPerKg.toFixed(0)}g per kg of base`
        : null,
    } satisfies ReactiveFlavorRow;
  }, [intensityScale, matchedFlavorIngredient, profile]);

  const result = useMemo(() => {
    try {
      const recipe = balanceGelato({
        ...options,
        ingredientLibrary,
        flavorProfile,
        intensity: intensityScale,
      });
      const textureAlert =
        recipe.metrics.solidsPct > 42 || recipe.metrics.fatPct > 16;
      const warnings = textureAlert
        ? [...recipe.warnings, buildTextureWarning(recipe)]
        : recipe.warnings;

      return {
        recipe: {
          ...recipe,
          warnings,
        } satisfies BalancedRecipe,
        error: null,
        textureAlert,
      };
    } catch (error) {
      return {
        recipe: null,
        error:
          error instanceof Error
            ? error.message
            : "Unable to rebalance right now.",
        textureAlert: false,
      };
    }
  }, [flavorProfile, ingredientLibrary, intensityScale, options]);

  return {
    flavorIntensity,
    setFlavorIntensity,
    recipe: result.recipe,
    error: result.error,
    textureAlert: result.textureAlert,
    flavorRow,
  };
}
