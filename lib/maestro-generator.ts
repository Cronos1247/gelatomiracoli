import { balanceGelato, type BalancedRecipe, type TargetProfileKey } from "@/lib/balance-gelato";
import { defaultEquipment, flavorProfiles, type DisplayType, type FlavorKey, type Ingredient } from "@/lib/default-data";
import { FlavorArchetypes, type FlavorArchetypeKey } from "@/lib/template-engine";

export type MaestroDraft = {
  keyword: string;
  archetype: FlavorArchetypeKey;
  flavorKey: FlavorKey;
  recipeStyle: TargetProfileKey;
  targetFatPct: number;
  targetPac: number;
  targetPodPct: number;
  targetSolidsPct: number;
  matchedIngredients: Ingredient[];
  suggestion: string | null;
  disclaimer: string | null;
  recipe: BalancedRecipe;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9%]+/g, " ").trim();
}

function scoreKeywordMatch(ingredient: Ingredient, keyword: string) {
  const haystack = normalize(
    [ingredient.name, ingredient.brand_name, ingredient.product_code, ingredient.category]
      .filter(Boolean)
      .join(" ")
  );
  const terms = normalize(keyword).split(/\s+/).filter(Boolean);
  let score = 0;

  for (const term of terms) {
    if (haystack.includes(term)) {
      score += term.length >= 5 ? 6 : 3;
    }
  }

  if (ingredient.is_master) {
    score += 5;
  }

  if (ingredient.data_priority === "verified_lab_data") {
    score += 8;
  } else if (ingredient.data_priority === "proxy_mode") {
    score += 3;
  }

  if (ingredient.dosage_guideline) {
    score += 2;
  }

  return score;
}

export function inferArchetypeFromKeyword(keyword: string): FlavorArchetypeKey {
  const normalized = normalize(keyword);

  if (/(fruit|sorbet|strawberr|mango|raspberr|lemon|lime)/.test(normalized)) {
    return "Fruit";
  }

  if (/(custard|crema|vanilla|french vanilla|egg|creme)/.test(normalized)) {
    return "Custard";
  }

  if (/(pistach|hazelnut|nocciol|mandorl|nut|giand)/.test(normalized)) {
    return "Nut";
  }

  return "Chocolate";
}

function findPantryMatches(ingredients: Ingredient[], keyword: string) {
  return [...ingredients]
    .sort((left, right) => scoreKeywordMatch(right, keyword) - scoreKeywordMatch(left, keyword))
    .filter((ingredient) => scoreKeywordMatch(ingredient, keyword) > 0);
}

function findGenericIngredient(ingredients: Ingredient[], names: string[]) {
  return (
    ingredients.find((ingredient) =>
      names.some((name) => normalize(ingredient.name).includes(normalize(name)))
    ) ?? null
  );
}

export function generateRecipeFromKeyword(
  keyword: string,
  targetVolume: number,
  {
    ingredientLibrary,
    pantryStock,
    displayType,
    availableSugars,
    equipment = defaultEquipment[0],
  }: {
    ingredientLibrary: Ingredient[];
    pantryStock: Partial<Record<string, boolean>>;
    displayType: DisplayType;
    availableSugars: Array<"Sucrose" | "Dextrose" | "Invert Sugar" | "Polydextrose" | "Maltodextrin">;
    equipment?: typeof defaultEquipment[number];
  }
): MaestroDraft {
  const archetype = inferArchetypeFromKeyword(keyword);
  const archetypeConfig = FlavorArchetypes[archetype];
  const pantryMatches = findPantryMatches(ingredientLibrary, keyword).filter(
    (ingredient) => pantryStock[ingredient.name] !== false
  );
  const verifiedMatches = pantryMatches.filter(
    (ingredient) => ingredient.is_master && ingredient.data_priority === "verified_lab_data"
  );

  let flavorKey: FlavorKey = "dark-chocolate";
  let fixedIngredients = flavorProfiles["dark-chocolate"].fixedIngredients;
  let suggestion: string | null = null;
  let disclaimer: string | null = null;

  if (archetype === "Chocolate") {
    flavorKey = "dark-chocolate";

    const exactChocolate = verifiedMatches[0] ?? pantryMatches[0] ?? null;
    const cocoa = findGenericIngredient(ingredientLibrary, ["Cocoa Powder", "Cocoa Powder (22/24)", "Cacao"]);
    const darkChocolate =
      findGenericIngredient(ingredientLibrary, ["Dark Chocolate 70%", "Dark Chocolate (70%)", "Fondente"]) ??
      exactChocolate;

    if (exactChocolate?.dosage_guideline) {
      fixedIngredients = [
        {
          name: exactChocolate.name,
          grams_per_kg_mix: exactChocolate.dosage_guideline,
          fat_pct: exactChocolate.fat_pct,
          sugar_pct: exactChocolate.sugar_pct,
          solids_non_fat_pct: exactChocolate.solids_non_fat_pct,
          other_solids_pct: exactChocolate.other_solids_pct,
          pac_value: exactChocolate.pac_value,
          pod_value: exactChocolate.pod_value,
          cost_per_kg: exactChocolate.cost_per_kg,
        },
      ];
      suggestion = `...using ${exactChocolate.name}?`;
    } else {
      fixedIngredients = [
        {
          name: darkChocolate?.name ?? "Dark Chocolate (70%)",
          grams_per_kg_mix: darkChocolate?.dosage_guideline ?? 120,
          fat_pct: darkChocolate?.fat_pct ?? 42,
          sugar_pct: darkChocolate?.sugar_pct ?? 29,
          solids_non_fat_pct: darkChocolate?.solids_non_fat_pct ?? 0,
          other_solids_pct: darkChocolate?.other_solids_pct ?? 28,
          pac_value: darkChocolate?.pac_value ?? 94,
          pod_value: darkChocolate?.pod_value ?? 80,
          cost_per_kg: darkChocolate?.cost_per_kg ?? 12.5,
        },
        {
          name: cocoa?.name ?? "Cocoa Powder (22/24)",
          grams_per_kg_mix: cocoa?.dosage_guideline ?? 22,
          fat_pct: cocoa?.fat_pct ?? 23,
          sugar_pct: cocoa?.sugar_pct ?? 0,
          solids_non_fat_pct: cocoa?.solids_non_fat_pct ?? 0,
          other_solids_pct: cocoa?.other_solids_pct ?? 75,
          pac_value: cocoa?.pac_value ?? 12,
          pod_value: cocoa?.pod_value ?? 4,
          cost_per_kg: cocoa?.cost_per_kg ?? 9.2,
        },
      ];
      suggestion = darkChocolate ? `...using ${darkChocolate.name}?` : "...using Cocoa Powder and 70% Dark Chocolate?";
    }
  } else if (archetype === "Nut") {
    flavorKey = /(hazelnut|nocciol|giand)/.test(normalize(keyword)) ? "gianduja" : "pistachio";
    const matchedNut = verifiedMatches[0] ?? pantryMatches[0] ?? null;

    if (matchedNut) {
      fixedIngredients = [
        {
          name: matchedNut.name,
          grams_per_kg_mix: matchedNut.dosage_guideline ?? 100,
          fat_pct: matchedNut.fat_pct,
          sugar_pct: matchedNut.sugar_pct,
          solids_non_fat_pct: matchedNut.solids_non_fat_pct,
          other_solids_pct: matchedNut.other_solids_pct,
          pac_value: matchedNut.pac_value,
          pod_value: matchedNut.pod_value,
          cost_per_kg: matchedNut.cost_per_kg,
        },
      ];
      suggestion = `...using ${matchedNut.name}?`;
    }
  } else if (archetype === "Fruit") {
    flavorKey = "strawberry";
    const fruit =
      verifiedMatches[0] ??
      pantryMatches[0] ??
      findGenericIngredient(ingredientLibrary, ["Strawberry (Fresh/Puree)", "Strawberry (Fresh)", "Mango (Alphonso Puree)", "Lemon Juice"]);

    fixedIngredients = fruit
      ? [
          {
            name: fruit.name,
            grams_per_kg_mix: fruit.dosage_guideline ?? 260,
            fat_pct: fruit.fat_pct,
            sugar_pct: fruit.sugar_pct,
            solids_non_fat_pct: fruit.solids_non_fat_pct,
            other_solids_pct: fruit.other_solids_pct,
            pac_value: fruit.pac_value,
            pod_value: fruit.pod_value,
            cost_per_kg: fruit.cost_per_kg,
          },
        ]
      : [];
    suggestion = fruit ? `...using ${fruit.name}?` : null;
  } else {
    flavorKey = "fior-di-latte";
    const eggYolk = findGenericIngredient(ingredientLibrary, ["Egg Yolk", "Tuorlo"]);
    fixedIngredients = eggYolk
      ? [
          {
            name: eggYolk.name,
            grams_per_kg_mix: eggYolk.dosage_guideline ?? 60,
            fat_pct: eggYolk.fat_pct,
            sugar_pct: eggYolk.sugar_pct,
            solids_non_fat_pct: eggYolk.solids_non_fat_pct,
            other_solids_pct: eggYolk.other_solids_pct,
            pac_value: eggYolk.pac_value,
            pod_value: eggYolk.pod_value,
            cost_per_kg: eggYolk.cost_per_kg,
          },
        ]
      : [];
    disclaimer = eggYolk
      ? "Custard archetype includes egg yolk solids in the fixed load."
      : "Estimated balance - no egg yolk tech sheet found.";
  }

  const recipe = balanceGelato({
    targetBatchKg: targetVolume,
    flavorProfile: {
      key: flavorKey,
      label: keyword.trim() || flavorProfiles[flavorKey].label,
      notes: `Generated from keyword: ${keyword}`,
      targetFatPct: archetypeConfig.targetFatPct,
      targetPac: archetypeConfig.targetPac,
      targetPodPct: archetypeConfig.targetPodPct,
      targetSolidsPct: archetypeConfig.targetSolidsPct,
      fixedIngredients,
    },
    baseType: archetype === "Fruit" ? "Cold" : equipment.heating_capability ? "Hot" : "Cold",
    displayType,
    equipment,
    ingredientLibrary,
    availableSugars,
    pantryStock,
    recipeStyle: archetypeConfig.recipeStyle,
    targetFatPct: archetypeConfig.targetFatPct,
    targetPac: archetypeConfig.targetPac,
    targetPodPct: archetypeConfig.targetPodPct,
    targetSolidsPct: archetypeConfig.targetSolidsPct,
  });

  return {
    keyword,
    archetype,
    flavorKey,
    recipeStyle: archetypeConfig.recipeStyle,
    targetFatPct: archetypeConfig.targetFatPct,
    targetPac: archetypeConfig.targetPac,
    targetPodPct: archetypeConfig.targetPodPct,
    targetSolidsPct: archetypeConfig.targetSolidsPct,
    matchedIngredients: pantryMatches.slice(0, 3),
    suggestion,
    disclaimer,
    recipe,
  };
}
