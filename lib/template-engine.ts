import {
  type FixedFlavorIngredient,
  type FlavorKey,
  type FlavorProfile,
  type Ingredient,
  type IngredientDataPriority,
} from "@/lib/default-data";

type ResolvedFixedFlavorIngredient = FixedFlavorIngredient & {
  data_priority: IngredientDataPriority;
  resolution_source: "pantry" | "archetype_default";
  matched_ingredient_name: string | null;
};

export type ResolvedFlavorArchetype = Omit<FlavorProfile, "fixedIngredients"> & {
  fixedIngredients: ResolvedFixedFlavorIngredient[];
  archetypeName: string | null;
  archetypeNotes: string[];
};

type IngredientSlot = {
  slotId: string;
  fallback: FixedFlavorIngredient;
  gramsPerKgMix: number;
  matcher: (ingredient: Ingredient) => boolean;
};

type ArchetypeRecipe = {
  key: FlavorKey;
  label: string;
  targetFatPct?: number;
  targetPac?: number;
  targetPodPct?: number;
  targetSolidsPct?: number;
  notes: string[];
  slots: IngredientSlot[];
};

export const FlavorArchetypes = {
  Chocolate: {
    targetFatPct: 11,
    targetPac: 240,
    targetPodPct: 18,
    targetSolidsPct: 39,
    recipeStyle: "Gelato" as const,
  },
  Nut: {
    targetFatPct: 11,
    targetPac: 235,
    targetPodPct: 17,
    targetSolidsPct: 39,
    recipeStyle: "Gelato" as const,
  },
  Fruit: {
    targetFatPct: 0.5,
    targetPac: 290,
    targetPodPct: 28,
    targetSolidsPct: 31,
    recipeStyle: "Sorbet" as const,
  },
  Custard: {
    targetFatPct: 8,
    targetPac: 238,
    targetPodPct: 17,
    targetSolidsPct: 38,
    recipeStyle: "Gelato" as const,
    notes: ["Custard/Crema archetypes include egg yolk solids in the fixed load."],
  },
} as const;

export type FlavorArchetypeKey = keyof typeof FlavorArchetypes;

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9%]+/g, " ").trim();

function hasAnyTerm(haystack: string, terms: string[]) {
  return terms.some((term) => haystack.includes(term));
}

function scoreIngredientMatch(ingredient: Ingredient, preferredTerms: string[]) {
  const haystack = normalize(
    [ingredient.name, ingredient.brand_name, ingredient.product_code].filter(Boolean).join(" ")
  );

  let score = 0;

  for (const term of preferredTerms) {
    if (haystack.includes(term)) {
      score += term.length >= 6 ? 4 : 2;
    }
  }

  if (ingredient.data_priority === "verified_lab_data") {
    score += 6;
  } else if (ingredient.data_priority === "proxy_mode") {
    score += 3;
  }

  if (ingredient.is_master) {
    score += 1;
  }

  return score;
}

function pickBestIngredient(ingredientLibrary: Ingredient[], slot: IngredientSlot, preferredTerms: string[]) {
  return (
    ingredientLibrary
      .filter(slot.matcher)
      .sort((left, right) => {
        const leftScore = scoreIngredientMatch(left, preferredTerms);
        const rightScore = scoreIngredientMatch(right, preferredTerms);

        if (leftScore !== rightScore) {
          return rightScore - leftScore;
        }

        return left.name.localeCompare(right.name);
      })[0] ?? null
  );
}

const darkChocolateArchetype: ArchetypeRecipe = {
  key: "dark-chocolate",
  label: "Dark Chocolate",
  targetFatPct: FlavorArchetypes.Chocolate.targetFatPct,
  targetPac: FlavorArchetypes.Chocolate.targetPac,
  targetPodPct: FlavorArchetypes.Chocolate.targetPodPct,
  targetSolidsPct: FlavorArchetypes.Chocolate.targetSolidsPct,
  notes: [
    "Dark Chocolate archetype is designed to absorb cocoa butter and cocoa fiber without flattening scoopability.",
    "When no branded paste is selected, the engine queries the pantry for generic Cocoa Powder and 70% Dark Chocolate before falling back to house averages.",
  ],
  slots: [
    {
      slotId: "dark-chocolate-70",
      gramsPerKgMix: 120,
      fallback: {
        name: "Dark Chocolate 70%",
        grams_per_kg_mix: 120,
        fat_pct: 32,
        sugar_pct: 38,
        solids_non_fat_pct: 8,
        other_solids_pct: 20,
        pac_value: 96,
        pod_value: 82,
        cost_per_kg: 12.5,
      },
      matcher: (ingredient) => {
        const haystack = normalize(
          [ingredient.name, ingredient.brand_name, ingredient.product_code].filter(Boolean).join(" ")
        );

        return (
          hasAnyTerm(haystack, ["dark chocolate", "fondente", "70%", "70 ", "70 cacao", "70 cocoa"]) &&
          !hasAnyTerm(haystack, ["powder", "cocoa powder", "cacao powder"])
        );
      },
    },
    {
      slotId: "cocoa-powder",
      gramsPerKgMix: 22,
      fallback: {
        name: "Cocoa Powder",
        grams_per_kg_mix: 22,
        fat_pct: 11,
        sugar_pct: 1,
        solids_non_fat_pct: 20,
        other_solids_pct: 62,
        pac_value: 12,
        pod_value: 4,
        cost_per_kg: 9.2,
      },
      matcher: (ingredient) => {
        const haystack = normalize(
          [ingredient.name, ingredient.brand_name, ingredient.product_code].filter(Boolean).join(" ")
        );

        return hasAnyTerm(haystack, ["cocoa powder", "cacao powder", "cocoa", "cacao"]);
      },
    },
  ],
};

export const archetypeRecipes: Partial<Record<FlavorKey, ArchetypeRecipe>> = {
  "dark-chocolate": darkChocolateArchetype,
};

export function resolveFlavorArchetype(
  flavor: FlavorProfile,
  ingredientLibrary: Ingredient[]
): ResolvedFlavorArchetype {
  const archetype = archetypeRecipes[flavor.key];

  if (!archetype) {
    return {
      ...flavor,
      fixedIngredients: flavor.fixedIngredients.map((ingredient) => ({
        ...ingredient,
        data_priority: "industry_average" as const,
        resolution_source: "archetype_default" as const,
        matched_ingredient_name: null,
      })),
      archetypeName: null,
      archetypeNotes: [],
    };
  }

  const fixedIngredients = archetype.slots.map((slot) => {
    const matchedIngredient = pickBestIngredient(ingredientLibrary, slot, [
      normalize(slot.fallback.name),
      slot.slotId.replace(/-/g, " "),
      archetype.label.toLowerCase(),
    ]);

    if (!matchedIngredient) {
      return {
        ...slot.fallback,
        grams_per_kg_mix: slot.gramsPerKgMix,
        data_priority: "industry_average" as const,
        resolution_source: "archetype_default" as const,
        matched_ingredient_name: null,
      };
    }

    return {
      name: matchedIngredient.name,
      grams_per_kg_mix: slot.gramsPerKgMix,
      fat_pct: matchedIngredient.fat_pct,
      sugar_pct: matchedIngredient.sugar_pct,
      solids_non_fat_pct: matchedIngredient.solids_non_fat_pct,
      other_solids_pct: matchedIngredient.other_solids_pct,
      pac_value: matchedIngredient.pac_value,
      pod_value: matchedIngredient.pod_value,
      cost_per_kg:
        matchedIngredient.cost_per_kg || matchedIngredient.average_market_cost || slot.fallback.cost_per_kg,
      data_priority: matchedIngredient.data_priority,
      resolution_source: "pantry" as const,
      matched_ingredient_name: matchedIngredient.name,
    };
  });

  const matchedNames = fixedIngredients
    .filter((ingredient) => ingredient.resolution_source === "pantry" && ingredient.matched_ingredient_name)
    .map((ingredient) => ingredient.matched_ingredient_name);

  const archetypeNotes = [
    ...archetype.notes,
    matchedNames.length
      ? `Pantry match: ${matchedNames.join(" + ")}.`
      : "No pantry chocolate archetype matches found, so the engine fell back to house generic cocoa and dark-chocolate averages.",
  ];

  return {
    ...flavor,
      targetFatPct: archetype.targetFatPct ?? flavor.targetFatPct,
    targetPac: archetype.targetPac ?? flavor.targetPac,
      targetPodPct: archetype.targetPodPct ?? flavor.targetPodPct,
    targetSolidsPct: archetype.targetSolidsPct ?? flavor.targetSolidsPct,
      fixedIngredients,
      archetypeName: archetype.label,
      archetypeNotes,
  };
}
