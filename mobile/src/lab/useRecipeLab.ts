import * as Haptics from "expo-haptics";
import { useCallback, useMemo, useState } from "react";
import type { MobileIngredient } from "../types";
import { ARCHETYPES } from "../lib/maestro";
import type { MobileLanguage } from "../i18n";

type IngredientRole =
  | "flavor"
  | "totalbase"
  | "water"
  | "milk"
  | "cream"
  | "sucrose"
  | "dextrose"
  | "maltodextrin"
  | "nfdm"
  | "coconutFat"
  | "erythritol"
  | "polydextrose";

type SugarRole =
  | "sucrose"
  | "dextrose"
  | "maltodextrin"
  | "erythritol"
  | "polydextrose";

export type LabIngredient = MobileIngredient & {
  role: IngredientRole;
  grams: number;
  locked: boolean;
  ghost?: boolean;
  suggestionCtaLabel?: string | null;
  suggestionNote?: string | null;
};

export type BaseType = "dairy" | "water";

export type LabMetrics = {
  fat: number;
  sugar: number;
  solids: number;
  pac: number;
  pod: number;
};

type Snapshot = {
  keyword: string;
  archetypeKey: keyof typeof ARCHETYPES;
  baseType: BaseType;
  batchLiters: number;
  flavorIntensityPct: number;
  podBias: number;
  manualWeights: Partial<Record<IngredientRole, number>>;
  locked: Partial<Record<IngredientRole, boolean>>;
  ingredientOverrides: Partial<Record<IngredientRole, MobileIngredient>>;
  removedRoles: Partial<Record<IngredientRole, boolean>>;
};

type ResolvedFlavor = {
  ingredient: MobileIngredient;
  ghost: boolean;
  suggestionNote?: string | null;
};

type ResolvedStructuralBase = {
  ingredient: MobileIngredient;
  ghost: boolean;
  suggestionNote?: string | null;
  suggestionCtaLabel?: string | null;
};

type SugarConfig = {
  role: SugarRole;
  ingredient: MobileIngredient;
  share: number;
};

const TOTAL_BASE_DOSAGE = 100;
const FRUTTOSA_DOSAGE = 50;
const CLEAN_LABEL_SMP_DOSAGE = 35;
const CLEAN_LABEL_BINDER_DOSAGE = 4;
const CLEAN_LABEL_PECTIN_DOSAGE = 8;

const FALLBACK_INGREDIENTS: Record<IngredientRole, MobileIngredient> = {
  flavor: {
    name: "Pistachio Paste (Pure)",
    name_en: "Pistachio Paste (Pure)",
    name_es: "Pasta de Pistacho Pura",
    name_it: "Pasta Pistacchio Pura",
    category: "Flavor Paste",
    fat_pct: 45,
    sugar_pct: 5,
    total_solids_pct: 98,
    pac_value: 5,
    pod_value: 5,
    dosage_guideline_per_kg: 100,
    is_master: true,
    status: "verified",
  },
  milk: {
    name: "Whole Milk",
    name_en: "Whole Milk",
    name_es: "Leche Entera",
    name_it: "Latte Intero",
    category: "Dairy",
    fat_pct: 3.5,
    sugar_pct: 4.8,
    total_solids_pct: 12,
    pac_value: 1,
    pod_value: 0.16,
    is_master: true,
  },
  cream: {
    name: "Heavy Cream (36%)",
    name_en: "Heavy Cream (36%)",
    name_es: "Crema 36%",
    name_it: "Panna 36%",
    category: "Dairy",
    fat_pct: 36,
    sugar_pct: 3,
    total_solids_pct: 41,
    pac_value: 0.8,
    pod_value: 0.1,
    is_master: true,
  },
  sucrose: {
    name: "Sucrose",
    name_en: "Sucrose",
    name_es: "Sacarosa",
    name_it: "Saccarosio",
    category: "Sugar",
    fat_pct: 0,
    sugar_pct: 100,
    total_solids_pct: 100,
    pac_value: 1,
    pod_value: 1,
    is_master: true,
  },
  dextrose: {
    name: "Dextrose",
    name_en: "Dextrose",
    name_es: "Dextrosa",
    name_it: "Destrosio",
    category: "Sugar",
    fat_pct: 0,
    sugar_pct: 95,
    total_solids_pct: 95,
    pac_value: 1.9,
    pod_value: 0.7,
    is_master: true,
  },
  maltodextrin: {
    name: "Maltodextrin (DE19)",
    name_en: "Maltodextrin (DE19)",
    name_es: "Maltodextrina (DE19)",
    name_it: "Maltodestrina (DE19)",
    category: "Sugar",
    fat_pct: 0,
    sugar_pct: 5,
    total_solids_pct: 95,
    pac_value: 0.2,
    pod_value: 0.1,
    is_master: true,
  },
  nfdm: {
    name: "Skim Milk Powder (NFDM)",
    name_en: "Skim Milk Powder (NFDM)",
    name_es: "Leche Desnatada en Polvo (NFDM)",
    name_it: "Latte Magro in Polvere (NFDM)",
    category: "Dairy",
    fat_pct: 0.8,
    sugar_pct: 50,
    total_solids_pct: 97,
    pac_value: 1,
    pod_value: 0.16,
    is_master: true,
  },
  totalbase: {
    name: "Totalbase",
    name_en: "Totalbase",
    name_es: "Totalbase",
    name_it: "Totalbase",
    category: "Base",
    fat_pct: 0,
    sugar_pct: 6,
    total_solids_pct: 96,
    pac_value: 0.8,
    pod_value: 0.25,
    dosage_guideline_per_kg: 50,
    is_master: true,
  },
  water: {
    name: "Water",
    name_en: "Water",
    name_es: "Agua",
    name_it: "Acqua",
    category: "Other",
    fat_pct: 0,
    sugar_pct: 0,
    total_solids_pct: 0,
    pac_value: 0,
    pod_value: 0,
    is_master: true,
  },
  coconutFat: {
    name: "Coconut Fat",
    name_en: "Coconut Fat",
    name_es: "Grasa de Coco",
    name_it: "Grasso di Cocco",
    category: "Other",
    fat_pct: 90,
    sugar_pct: 0,
    total_solids_pct: 100,
    pac_value: 0,
    pod_value: 0,
    is_master: true,
  },
  erythritol: {
    name: "Erythritol",
    name_en: "Erythritol",
    name_es: "Eritritol",
    name_it: "Eritritolo",
    category: "Sugar",
    fat_pct: 0,
    sugar_pct: 100,
    total_solids_pct: 100,
    pac_value: 0.7,
    pod_value: 0.6,
    is_master: true,
  },
  polydextrose: {
    name: "Polydextrose",
    name_en: "Polydextrose",
    name_es: "Polidextrosa",
    name_it: "Polidestrosio",
    category: "Sugar",
    fat_pct: 0,
    sugar_pct: 5,
    total_solids_pct: 100,
    pac_value: 0.25,
    pod_value: 0.05,
    is_master: true,
  },
};

const SHADOW_LIBRARY: MobileIngredient[] = [
  {
    name: "PreGel Granulato Chocolate (Classic)",
    name_en: "PreGel Granulato Chocolate (Classic)",
    name_es: "PreGel Granulato Chocolate (Clásico)",
    name_it: "PreGel Granulato Cioccolato (Classico)",
    category: "Flavor Paste",
    fat_pct: 16,
    sugar_pct: 28,
    total_solids_pct: 96,
    pac_value: 28,
    pod_value: 22,
    dosage_guideline_per_kg: 180,
    average_market_cost: 24,
    is_master: true,
    status: "verified",
  },
  {
    name: "PreGel Granulato Chocolate (Vegan)",
    name_en: "PreGel Granulato Chocolate (Vegan)",
    name_es: "PreGel Granulato Chocolate (Vegano)",
    name_it: "PreGel Granulato Cioccolato (Vegano)",
    category: "Flavor Paste",
    fat_pct: 18,
    sugar_pct: 26,
    total_solids_pct: 96,
    pac_value: 26,
    pod_value: 19,
    dosage_guideline_per_kg: 180,
    average_market_cost: 26,
    is_master: true,
    status: "verified",
  },
  {
    name: "PreGel Pure Pistacchio Anatolia",
    name_en: "PreGel Pure Pistachio Anatolia",
    name_es: "PreGel Pistacho Anatolia",
    name_it: "PreGel Pistacchio Anatolia",
    category: "Flavor Paste",
    fat_pct: 59.5,
    sugar_pct: 0,
    total_solids_pct: 98.5,
    pac_value: 0,
    pod_value: 0,
    dosage_guideline_per_kg: 100,
    average_market_cost: 58,
    is_master: true,
    status: "verified",
  },
  {
    name: "PreGel Pasta Nocciola Suprema",
    name_en: "PreGel Hazelnut Suprema",
    name_es: "PreGel Avellana Suprema",
    name_it: "PreGel Nocciola Suprema",
    category: "Flavor Paste",
    fat_pct: 52,
    sugar_pct: 4,
    total_solids_pct: 98,
    pac_value: 4,
    pod_value: 4,
    dosage_guideline_per_kg: 100,
    average_market_cost: 42,
    is_master: true,
    status: "verified",
  },
  {
    name: "PreGel Strawberry Sprint",
    name_en: "PreGel Strawberry Sprint",
    name_es: "PreGel Fresa Sprint",
    name_it: "PreGel Fragola Sprint",
    category: "Flavor Paste",
    fat_pct: 0.4,
    sugar_pct: 21,
    total_solids_pct: 32,
    pac_value: 22,
    pod_value: 21,
    dosage_guideline_per_kg: 120,
    average_market_cost: 18,
    is_master: true,
    status: "verified",
  },
  {
    name: "PreGel Zero Sugar Chocolate Base",
    name_en: "PreGel Zero Sugar Chocolate Base",
    name_es: "PreGel Base Chocolate Sin Azúcar",
    name_it: "PreGel Base Cioccolato Zero Zucchero",
    category: "Flavor Paste",
    fat_pct: 14,
    sugar_pct: 9,
    total_solids_pct: 97,
    pac_value: 15,
    pod_value: 6,
    dosage_guideline_per_kg: 160,
    average_market_cost: 28,
    is_master: true,
    status: "verified",
  },
];

const FALLBACK_FRUTTOSA_BASE: MobileIngredient = {
  name: "PreGel Fruttosa",
  name_en: "PreGel Fruttosa",
  name_es: "PreGel Fruttosa",
  name_it: "PreGel Fruttosa",
  category: "Fruit Base",
  fat_pct: 0,
  sugar_pct: 80,
  total_solids_pct: 91.9,
  pac_value: 81.43,
  pod_value: 80.23,
  dosage_guideline_per_kg: FRUTTOSA_DOSAGE,
  dosage_guideline: FRUTTOSA_DOSAGE,
  is_cold_process: true,
  is_master: true,
  status: "draft",
};

const CLEAN_LABEL_BINDER: MobileIngredient = {
  name: "Locust Bean Gum / Guar Blend",
  name_en: "Locust Bean Gum / Guar Blend",
  name_es: "Mezcla de Goma Garrofin y Guar",
  name_it: "Miscela Farina di Semi di Carrube e Guar",
  category: "Base/Stabilizer",
  fat_pct: 0,
  sugar_pct: 0,
  total_solids_pct: 100,
  water_pct: 0,
  pac_value: 0,
  pod_value: 0,
  dosage_guideline_per_kg: CLEAN_LABEL_BINDER_DOSAGE,
  dosage_guideline: CLEAN_LABEL_BINDER_DOSAGE,
  is_base_ingredient: true,
  is_cold_process: true,
  is_master: true,
  status: "verified",
};

const CLEAN_LABEL_PECTIN: MobileIngredient = {
  name: "Pectin",
  name_en: "Pectin",
  name_es: "Pectina",
  name_it: "Pectina",
  category: "Base/Stabilizer",
  fat_pct: 0,
  sugar_pct: 0,
  total_solids_pct: 100,
  water_pct: 0,
  pac_value: 0,
  pod_value: 0,
  dosage_guideline_per_kg: CLEAN_LABEL_PECTIN_DOSAGE,
  dosage_guideline: CLEAN_LABEL_PECTIN_DOSAGE,
  is_base_ingredient: true,
  is_cold_process: true,
  is_master: true,
  status: "verified",
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function round(value: number) {
  return Math.max(0, Math.round(value * 10) / 10);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function calculateIngredientCost(
  ingredient: Pick<
    MobileIngredient,
    "cost_per_container" | "container_size_g" | "average_market_cost"
  >,
  weightUsed: number
) {
  const grams = Math.max(0, Number(weightUsed ?? 0));
  const costPerContainer = Number(
    ingredient.cost_per_container ?? ingredient.average_market_cost ?? 0
  );
  const containerSize = Number(ingredient.container_size_g ?? 0);

  if (grams <= 0 || costPerContainer <= 0) {
    return 0;
  }

  if (containerSize > 0) {
    return (costPerContainer / containerSize) * grams;
  }

  const fallbackPerKg = Number(ingredient.average_market_cost ?? 0);

  if (fallbackPerKg > 0) {
    return (fallbackPerKg / 1000) * grams;
  }

  return 0;
}

function getIngredientWaterPct(ingredient: MobileIngredient) {
  if (typeof ingredient.water_pct === "number") {
    return clamp(ingredient.water_pct, 0, 100);
  }

  if (typeof ingredient.total_solids_pct === "number") {
    return clamp(100 - ingredient.total_solids_pct, 0, 100);
  }

  return 0;
}

function isFreshProduceIngredient(ingredient: MobileIngredient) {
  const name = normalize(ingredient.name);
  const category = normalize(ingredient.category ?? "");

  return (
    /fresh fruit|produce/.test(category) ||
    (/(strawberry|fragola|mango|lemon|limone|raspberry|lampone|fresh)/.test(name) &&
      !/paste|base|pregel|fruttosa|totalbase/.test(name))
  );
}

function shareToWeight(targetSugarGrams: number, share: number, ingredient: MobileIngredient) {
  const sugarRatio = Math.max((ingredient.sugar_pct ?? 0) / 100, 0.05);
  return (targetSugarGrams * share) / sugarRatio;
}

function findIngredient(
  ingredients: MobileIngredient[],
  matcher: (ingredient: MobileIngredient) => boolean,
  fallback: MobileIngredient
) {
  return ingredients.find(matcher) ?? fallback;
}

function resolveIngredientOverride(
  role: IngredientRole,
  overrides: Partial<Record<IngredientRole, MobileIngredient>>,
  fallback: MobileIngredient
) {
  return overrides[role] ?? fallback;
}

function inferRoleForIngredient(
  ingredient: MobileIngredient,
  baseType: BaseType,
  archetypeKey: keyof typeof ARCHETYPES
): IngredientRole {
  const name = normalize(ingredient.name);
  const category = normalize(ingredient.category ?? "");

  if (ingredient.is_flavor || /flavor|paste|fresh fruit/.test(category)) {
    return "flavor";
  }

  if (/water/.test(name)) {
    return "water";
  }

  if (/skim milk powder|smp|nfdm|milk powder/.test(name)) {
    return "nfdm";
  }

  if (/heavy cream|panna|cream/.test(name)) {
    return "cream";
  }

  if (/whole milk|latte|milk/.test(name)) {
    return "milk";
  }

  if (/maltodextrin/.test(name)) {
    return "maltodextrin";
  }

  if (/erythritol/.test(name)) {
    return "erythritol";
  }

  if (/polydextrose/.test(name)) {
    return "polydextrose";
  }

  if (/dextrose/.test(name)) {
    return "dextrose";
  }

  if (/sucrose|standard sugar|sugar/.test(name)) {
    return "sucrose";
  }

  if (/coconut fat|coconut oil|cocoa butter/.test(name)) {
    return "coconutFat";
  }

  if (/stabilizer|stabiliser|pectin|locust bean gum|guar|lbg|fruttosa|totalbase|base/.test(name) || /structure|base\/stabilizer|fruit base/.test(category)) {
    return "totalbase";
  }

  if (baseType === "water" || archetypeKey === "fruit-sorbet") {
    return "flavor";
  }

  return "flavor";
}

function findShadowSuggestion(keyword: string, archetypeKey: keyof typeof ARCHETYPES) {
  const value = normalize(keyword);

  if (archetypeKey === "vegan") {
    if (/hazelnut|nocciola/.test(value)) {
      return SHADOW_LIBRARY.find((ingredient) => /nocciola|hazelnut/i.test(ingredient.name)) ?? null;
    }

    if (/pistachio|pistacchio/.test(value)) {
      return SHADOW_LIBRARY.find((ingredient) => /anatolia|pist/i.test(ingredient.name)) ?? null;
    }

    return SHADOW_LIBRARY.find((ingredient) => /vegan/i.test(ingredient.name)) ?? SHADOW_LIBRARY[1];
  }

  if (archetypeKey === "sugar-free" || archetypeKey === "low-sugar") {
    return SHADOW_LIBRARY.find((ingredient) => /zero sugar/i.test(ingredient.name)) ?? null;
  }

  if (/hazelnut|nocciola/.test(value)) {
    return SHADOW_LIBRARY.find((ingredient) => /nocciola|hazelnut/i.test(ingredient.name)) ?? null;
  }

  if (/pistachio|pistacchio/.test(value)) {
    return SHADOW_LIBRARY.find((ingredient) => /anatolia|pist/i.test(ingredient.name)) ?? null;
  }

  if (/strawberry|fragola/.test(value)) {
    return SHADOW_LIBRARY.find((ingredient) => /strawberry|fragola/i.test(ingredient.name)) ?? null;
  }

  if (/chocolate|cocoa|dark/.test(value) || !value) {
    return SHADOW_LIBRARY.find((ingredient) => /classic\)/i.test(ingredient.name)) ?? SHADOW_LIBRARY[0];
  }

  return null;
}

function resolveFlavorIngredient(
  ingredients: MobileIngredient[],
  keyword: string,
  archetypeKey: keyof typeof ARCHETYPES,
  overrides: Partial<Record<IngredientRole, MobileIngredient>>
): ResolvedFlavor {
  if (overrides.flavor) {
    return { ingredient: overrides.flavor, ghost: false };
  }

  const flavorCandidates = ingredients.filter((ingredient) => ingredient.is_flavor === true);
  const value = normalize(keyword);

  const exact = flavorCandidates.find((ingredient) => {
    const name = normalize(ingredient.name);
    return value ? name.includes(value) || value.includes(name) : false;
  });

  if (exact) {
    return { ingredient: exact, ghost: false };
  }

  if (archetypeKey === "high-fat") {
    const contextual = flavorCandidates.find((ingredient) =>
      /pistachio|pistacchio|hazelnut|nocciola|dark chocolate|cocoa/i.test(ingredient.name)
    );

    if (contextual) {
      return { ingredient: contextual, ghost: false };
    }
  }

  if (archetypeKey === "fruit-sorbet") {
    const fruit = flavorCandidates.find((ingredient) =>
      /strawberry|mango|lemon|fragola/i.test(ingredient.name)
    );

    if (fruit) {
      return { ingredient: fruit, ghost: false };
    }

    return {
      ingredient: {
        name: "Strawberry (Fresh/Puree)",
        name_en: "Strawberry (Fresh/Puree)",
        name_es: "Fresa (Fresca/Puré)",
        name_it: "Fragola (Fresca/Purea)",
        category: "Other",
        fat_pct: 0.4,
        sugar_pct: 7,
        total_solids_pct: 10,
        pac_value: 7,
        pod_value: 7,
        dosage_guideline_per_kg: 300,
        is_master: true,
      },
      ghost: false,
    };
  }

  if (flavorCandidates.length > 0) {
    return { ingredient: flavorCandidates[0], ghost: false };
  }

  const shadowSuggestion = null;

  if (shadowSuggestion) {
    return {
      ingredient: shadowSuggestion,
      ghost: true,
      suggestionNote:
        archetypeKey === "vegan"
          ? "Suggested from the Shadow Library for a vegan-stable structure."
          : "Suggested from the Shadow Library while your local pantry is still empty.",
    };
  }

  return { ingredient: FALLBACK_INGREDIENTS.flavor, ghost: false };
}

function resolveStructuralBaseIngredient(
  ingredients: MobileIngredient[],
  baseType: BaseType,
  archetypeKey: keyof typeof ARCHETYPES,
  overrides: Partial<Record<IngredientRole, MobileIngredient>>
): ResolvedStructuralBase | null {
  const useVeganMatrix = archetypeKey === "vegan";
  const isCleanLabel = archetypeKey === "clean-label";

  if (overrides.totalbase) {
    return {
      ingredient: overrides.totalbase,
      ghost: false,
    };
  }

  if (isCleanLabel) {
    if (baseType === "dairy" && !useVeganMatrix) {
      const binder =
        ingredients.find((item) =>
          /locust bean gum|guar blend|guar gum|lbg/i.test(item.name)
        ) ?? CLEAN_LABEL_BINDER;

      return {
        ingredient: binder,
        ghost: false,
      };
    }

    if (baseType === "water" && !useVeganMatrix) {
      const pectin =
        ingredients.find((item) => /pectin/i.test(item.name)) ?? CLEAN_LABEL_PECTIN;

      return {
        ingredient: pectin,
        ghost: false,
      };
    }
  }

  if (baseType === "dairy" && !useVeganMatrix) {
    const exactTotalbase = ingredients.find((item) => normalize(item.name) === "totalbase");
    const contextualBase =
      exactTotalbase ??
      ingredients.find(
        (item) =>
          item.is_base_ingredient === true ||
          /(^|\s)totalbase(\s|$)/i.test(item.name) ||
          /base/i.test(item.category ?? "")
      );

    return {
      ingredient: contextualBase ?? FALLBACK_INGREDIENTS.totalbase,
      ghost: false,
    };
  }

  if (baseType === "water" && !useVeganMatrix) {
    const exactFruttosa = ingredients.find((item) => normalize(item.name) === "fruttosa");
    const fruitBase =
      exactFruttosa ??
      ingredients.find(
        (item) =>
          /(^|\s)fruttosa(\s|$)/i.test(item.name) ||
          /fruit base/i.test(item.category ?? "")
      );

    if (fruitBase) {
      return {
        ingredient: fruitBase,
        ghost: false,
      };
    }

    return {
      ingredient: FALLBACK_FRUTTOSA_BASE,
      ghost: true,
      suggestionCtaLabel: "Ingest Fruttosa",
      suggestionNote:
        "Suggested structural fruit base while your pantry is missing Fruttosa.",
    };
  }

  return null;
}

function translateIngredientName(ingredient: MobileIngredient, language: MobileLanguage) {
  if (language === "en" && typeof ingredient.name_en === "string") {
    return ingredient.name_en ?? ingredient.name;
  }

  if (language === "it" && typeof ingredient.name_it === "string") {
    return ingredient.name_it ?? ingredient.name;
  }

  if (language === "es" && typeof ingredient.name_es === "string") {
    return ingredient.name_es ?? ingredient.name;
  }

  return ingredient.name;
}

function computeHudPac(
  targetPac: number,
  sugarPct: number,
  targetSugarPct: number,
  dextroseGrams: number,
  bodySugarGrams: number,
  totalWeight: number
) {
  const dextrosePct = (dextroseGrams / totalWeight) * 100;
  const bodyPct = (bodySugarGrams / totalWeight) * 100;

  return clamp(targetPac + (sugarPct - targetSugarPct) * 4 + dextrosePct * 7 - bodyPct * 6, 180, 320);
}

function computeHudPod(
  targetPod: number,
  sugarPct: number,
  targetSugarPct: number,
  primarySweetenerGrams: number,
  bodySugarGrams: number,
  totalWeight: number
) {
  const primarySweetenerPct = (primarySweetenerGrams / totalWeight) * 100;
  const bodyPct = (bodySugarGrams / totalWeight) * 100;

  return clamp(targetPod + (sugarPct - targetSugarPct) * 0.5 + primarySweetenerPct * 0.1 - bodyPct * 0.4, 8, 30);
}

function computeProjectedSolidsPct(
  components: Array<{ weight: number; ingredient: MobileIngredient }>,
  batchWeight: number
) {
  const solids = components.reduce(
    (sum, component) =>
      sum + component.weight * ((component.ingredient.total_solids_pct ?? component.ingredient.sugar_pct ?? 0) / 100),
    0
  );

  return (solids / Math.max(batchWeight, 1)) * 100;
}

function solveMilkCream(
  totalWeight: number,
  targetFatGrams: number,
  milk: MobileIngredient,
  cream: MobileIngredient,
  lockedMilk: number | null,
  lockedCream: number | null
) {
  const milkFatRatio = (milk.fat_pct ?? 0) / 100;
  const creamFatRatio = (cream.fat_pct ?? 0) / 100;

  if (lockedMilk !== null && lockedCream !== null) {
    return {
      milk: lockedMilk,
      cream: lockedCream,
    };
  }

  if (lockedMilk !== null) {
    return {
      milk: lockedMilk,
      cream: clamp(totalWeight - lockedMilk, 0, totalWeight),
    };
  }

  if (lockedCream !== null) {
    return {
      milk: clamp(totalWeight - lockedCream, 0, totalWeight),
      cream: lockedCream,
    };
  }

  const creamWeight =
    (targetFatGrams - milkFatRatio * totalWeight) / Math.max(creamFatRatio - milkFatRatio, 0.001);

  return {
    cream: clamp(creamWeight, 0, totalWeight),
    milk: clamp(totalWeight - creamWeight, 0, totalWeight),
  };
}

function buildRecipeState(
  ingredients: MobileIngredient[],
  keyword: string,
  archetypeKey: keyof typeof ARCHETYPES,
  baseType: BaseType,
  batchLiters: number,
  flavorIntensityPct: number,
  podBias: number,
  manualWeights: Partial<Record<IngredientRole, number>>,
  locked: Partial<Record<IngredientRole, boolean>>,
  ingredientOverrides: Partial<Record<IngredientRole, MobileIngredient>>,
  removedRoles: Partial<Record<IngredientRole, boolean>>,
  language: MobileLanguage
) {
  const archetype = ARCHETYPES[archetypeKey];
  const batchWeight = batchLiters * 1000;
  const useVeganMatrix = archetypeKey === "vegan";
  const useSugarFreeMatrix = archetypeKey === "sugar-free";
  const isCleanLabel = archetypeKey === "clean-label";
  const resolvedFlavor = resolveFlavorIngredient(ingredients, keyword, archetypeKey, ingredientOverrides);
  const resolvedStructuralBase = resolveStructuralBaseIngredient(
    ingredients,
    baseType,
    archetypeKey,
    ingredientOverrides
  );
  const flavor = resolvedFlavor.ingredient;
  const milk = resolveIngredientOverride(
    "milk",
    ingredientOverrides,
    findIngredient(ingredients, (item) => /whole milk/i.test(item.name), FALLBACK_INGREDIENTS.milk)
  );
  const cream = resolveIngredientOverride(
    "cream",
    ingredientOverrides,
    findIngredient(ingredients, (item) => /heavy cream/i.test(item.name), FALLBACK_INGREDIENTS.cream)
  );
  const water = resolveIngredientOverride(
    "water",
    ingredientOverrides,
    findIngredient(ingredients, (item) => /^water$/i.test(item.name), FALLBACK_INGREDIENTS.water)
  );
  const totalbase = resolvedStructuralBase?.ingredient ?? FALLBACK_INGREDIENTS.totalbase;
  const sucrose = resolveIngredientOverride(
    "sucrose",
    ingredientOverrides,
    findIngredient(ingredients, (item) => /^Sucrose/i.test(item.name), FALLBACK_INGREDIENTS.sucrose)
  );
  const dextrose = resolveIngredientOverride(
    "dextrose",
    ingredientOverrides,
    findIngredient(ingredients, (item) => /^Dextrose$/i.test(item.name), FALLBACK_INGREDIENTS.dextrose)
  );
  const maltodextrin = resolveIngredientOverride(
    "maltodextrin",
    ingredientOverrides,
    findIngredient(ingredients, (item) => /maltodextrin/i.test(item.name), FALLBACK_INGREDIENTS.maltodextrin)
  );
  const nfdm = resolveIngredientOverride(
    "nfdm",
    ingredientOverrides,
    findIngredient(ingredients, (item) => /skim milk powder|nfdm|smp/i.test(item.name), FALLBACK_INGREDIENTS.nfdm)
  );
  const coconutFat = resolveIngredientOverride(
    "coconutFat",
    ingredientOverrides,
    findIngredient(ingredients, (item) => /coconut fat|coconut oil|cocoa butter/i.test(item.name), FALLBACK_INGREDIENTS.coconutFat)
  );
  const erythritol = resolveIngredientOverride(
    "erythritol",
    ingredientOverrides,
    findIngredient(ingredients, (item) => /erythritol/i.test(item.name), FALLBACK_INGREDIENTS.erythritol)
  );
  const polydextrose = resolveIngredientOverride(
    "polydextrose",
    ingredientOverrides,
    findIngredient(ingredients, (item) => /polydextrose/i.test(item.name), FALLBACK_INGREDIENTS.polydextrose)
  );

  const flavorWeight =
    removedRoles.flavor
      ? 0
      : locked.flavor && manualWeights.flavor !== undefined
      ? manualWeights.flavor
      : (flavor.dosage_guideline_per_kg ?? flavor.dosage_guideline ?? 100) *
        batchLiters *
        (flavorIntensityPct / 10);
  const totalbaseWeight =
    removedRoles.totalbase
      ? 0
      : resolvedStructuralBase
      ? isCleanLabel
        ? batchLiters *
          (resolvedStructuralBase.ingredient.dosage_guideline_per_kg ??
            resolvedStructuralBase.ingredient.dosage_guideline ??
            (baseType === "dairy" ? CLEAN_LABEL_BINDER_DOSAGE : CLEAN_LABEL_PECTIN_DOSAGE))
        : baseType === "dairy" && !useVeganMatrix
        ? batchLiters * TOTAL_BASE_DOSAGE
        : batchLiters *
          (resolvedStructuralBase.ingredient.dosage_guideline_per_kg ??
            resolvedStructuralBase.ingredient.dosage_guideline ??
            FRUTTOSA_DOSAGE)
      : 0;

  const targetFatGrams = (archetype.fat / 100) * batchWeight;
  const targetSugarGrams = (archetype.sugar / 100) * batchWeight;
  const calibratedTargetSolidsPct =
    baseType === "dairy" && !useVeganMatrix
      ? clamp(34 + ((flavor.fat_pct ?? 0) >= 40 ? 1 : 0), 33, 36)
      : archetype.solids;
  const targetSolidsGrams = (calibratedTargetSolidsPct / 100) * batchWeight;

  const flavorFat = flavorWeight * ((flavor.fat_pct ?? 0) / 100);
  const flavorSugar = flavorWeight * ((flavor.sugar_pct ?? 0) / 100);
  const totalbaseFat = totalbaseWeight * ((totalbase.fat_pct ?? 0) / 100);
  const totalbaseSugar = totalbaseWeight * ((totalbase.sugar_pct ?? 0) / 100);

  const sugarConfig: SugarConfig[] = useSugarFreeMatrix
    ? [
        {
          role: "erythritol",
          ingredient: erythritol,
          share: clamp(0.42 * podBias, 0.18, 0.42),
        },
        {
          role: "dextrose",
          ingredient: dextrose,
          share: clamp(0.18 + (1 - podBias) * 0.1, 0.18, 0.28),
        },
        {
          role: "polydextrose",
          ingredient: polydextrose,
          share: clamp(0.4 + (1 - podBias) * 0.18, 0.3, 0.54),
        },
      ]
    : [
        {
          role: "sucrose",
          ingredient: sucrose,
          share: clamp(0.68 * podBias, 0.2, 0.75),
        },
        {
          role: "dextrose",
          ingredient: dextrose,
          share: clamp(0.22 + (1 - podBias) * 0.25, 0.15, 0.5),
        },
      ];

  const activeSugarConfigs = sugarConfig.filter((config) => !removedRoles[config.role]);

  const sugarWeights: Partial<Record<SugarRole, number>> = {
    sucrose: removedRoles.sucrose ? 0 : locked.sucrose ? manualWeights.sucrose ?? 0 : 0,
    dextrose: removedRoles.dextrose ? 0 : locked.dextrose ? manualWeights.dextrose ?? 0 : 0,
    maltodextrin: removedRoles.maltodextrin ? 0 : locked.maltodextrin ? manualWeights.maltodextrin ?? 0 : 0,
    erythritol: removedRoles.erythritol ? 0 : locked.erythritol ? manualWeights.erythritol ?? 0 : 0,
    polydextrose: removedRoles.polydextrose ? 0 : locked.polydextrose ? manualWeights.polydextrose ?? 0 : 0,
  };

  const lockedSugarContribution = activeSugarConfigs.reduce((sum, config) => {
    return (
      sum +
      (locked[config.role]
        ? (manualWeights[config.role] ?? 0) * ((config.ingredient.sugar_pct ?? 0) / 100)
        : 0)
    );
  }, 0);

  const remainingSugarTarget = Math.max(
    0,
    targetSugarGrams - flavorSugar - totalbaseSugar - lockedSugarContribution
  );
  const unlockedSugarConfigs = activeSugarConfigs.filter((config) => !locked[config.role]);
  const activeSugarShareTotal = unlockedSugarConfigs.reduce((sum, config) => sum + config.share, 0);

  unlockedSugarConfigs.forEach((config) => {
    sugarWeights[config.role] =
      activeSugarShareTotal > 0
        ? shareToWeight(remainingSugarTarget, config.share / activeSugarShareTotal, config.ingredient)
        : 0;
  });

  let sucroseWeight = sugarWeights.sucrose ?? 0;
  const dextroseWeight = sugarWeights.dextrose ?? 0;
  const maltodextrinWeight = 0;
  let erythritolWeight = sugarWeights.erythritol ?? 0;
  const polydextroseWeight = sugarWeights.polydextrose ?? 0;

  let nfdmWeight =
    removedRoles.nfdm
      ? 0
      :
    isCleanLabel && baseType === "dairy" && !useVeganMatrix
      ? batchLiters * (nfdm.dosage_guideline_per_kg ?? nfdm.dosage_guideline ?? CLEAN_LABEL_SMP_DOSAGE)
      : 0;

  let milkWeight = removedRoles.milk ? 0 : locked.milk ? manualWeights.milk ?? 0 : manualWeights.milk ?? 0;
  let creamWeight = removedRoles.cream ? 0 : locked.cream ? manualWeights.cream ?? 0 : manualWeights.cream ?? 0;
  let waterWeight = removedRoles.water ? 0 : locked.water ? manualWeights.water ?? 0 : manualWeights.water ?? 0;
  let coconutFatWeight =
    removedRoles.coconutFat ? 0 : locked.coconutFat ? manualWeights.coconutFat ?? 0 : manualWeights.coconutFat ?? 0;

  const activeSugarWeights =
    sucroseWeight + dextroseWeight + maltodextrinWeight + erythritolWeight + polydextroseWeight;

  if (useVeganMatrix) {
    milkWeight = 0;
    creamWeight = 0;
    nfdmWeight = 0;

    if (!locked.coconutFat) {
      coconutFatWeight = clamp(
        Math.max(targetFatGrams - flavorFat, 0) / Math.max((coconutFat.fat_pct ?? 90) / 100, 0.01),
        0,
        140
      );
    }

    const fixedWeight = flavorWeight + activeSugarWeights + coconutFatWeight;
    waterWeight = locked.water ? waterWeight : Math.max(batchWeight - fixedWeight, batchWeight * 0.45);

    if (fixedWeight + waterWeight > batchWeight && !locked.water) {
      waterWeight = Math.max(0, batchWeight - fixedWeight);
    }
  } else if (baseType === "water") {
    milkWeight = 0;
    creamWeight = 0;
    nfdmWeight = 0;
    coconutFatWeight = 0;

    const waterFoundation = batchWeight * 0.65;
    const fixedWeight = flavorWeight + totalbaseWeight + activeSugarWeights + nfdmWeight;
    waterWeight = locked.water
      ? waterWeight
      : Math.max(waterFoundation, Math.max(batchWeight - fixedWeight, 0));

    const currentTotal = flavorWeight + totalbaseWeight + activeSugarWeights + nfdmWeight + waterWeight;
    if (currentTotal > batchWeight && !locked.water) {
      waterWeight = Math.max(0, waterWeight - (currentTotal - batchWeight));
    }
  } else {
    waterWeight = 0;
    coconutFatWeight = 0;

    const fixedWeight = flavorWeight + totalbaseWeight + nfdmWeight + activeSugarWeights;
    const fixedFat =
      flavorFat +
      totalbaseFat +
      nfdmWeight * ((nfdm.fat_pct ?? 0) / 100) +
      sucroseWeight * ((sucrose.fat_pct ?? 0) / 100) +
      dextroseWeight * ((dextrose.fat_pct ?? 0) / 100) +
      erythritolWeight * ((erythritol.fat_pct ?? 0) / 100) +
      polydextroseWeight * ((polydextrose.fat_pct ?? 0) / 100);

    const dairy = solveMilkCream(
      Math.max(batchWeight - fixedWeight, 0),
      Math.max(targetFatGrams - fixedFat, 0),
      milk,
      cream,
      removedRoles.milk ? 0 : locked.milk ? manualWeights.milk ?? 0 : null,
      removedRoles.cream ? 0 : locked.cream ? manualWeights.cream ?? 0 : null
    );

    milkWeight = dairy.milk;
    creamWeight = dairy.cream;

    for (let iteration = 0; iteration < 4; iteration += 1) {
      if (locked.milk || locked.cream) {
        break;
      }

      const projectedSolidsGrams =
        flavorWeight * ((flavor.total_solids_pct ?? flavor.sugar_pct ?? 0) / 100) +
        totalbaseWeight * ((totalbase.total_solids_pct ?? totalbase.sugar_pct ?? 0) / 100) +
        sucroseWeight * ((sucrose.total_solids_pct ?? 100) / 100) +
        dextroseWeight * ((dextrose.total_solids_pct ?? 95) / 100) +
        erythritolWeight * ((erythritol.total_solids_pct ?? 100) / 100) +
        polydextroseWeight * ((polydextrose.total_solids_pct ?? 100) / 100) +
        nfdmWeight * ((nfdm.total_solids_pct ?? 97) / 100) +
        milkWeight * ((milk.total_solids_pct ?? 12) / 100) +
        creamWeight * ((cream.total_solids_pct ?? 41) / 100);

      const solidsDeltaGrams = targetSolidsGrams - projectedSolidsGrams;
      const creamLiftPerGram = Math.max(
        ((cream.total_solids_pct ?? 41) - (milk.total_solids_pct ?? 12)) / 100,
        0.01
      );
      const dairyShift = clamp(solidsDeltaGrams / creamLiftPerGram, -creamWeight, milkWeight);

      if (Math.abs(dairyShift) < 0.1) {
        break;
      }

      milkWeight = Math.max(0, milkWeight - dairyShift);
      creamWeight = Math.max(0, creamWeight + dairyShift);
    }

    const projectedSolidsPct = computeProjectedSolidsPct(
      [
        { weight: flavorWeight, ingredient: flavor },
        { weight: totalbaseWeight, ingredient: totalbase },
        { weight: sucroseWeight, ingredient: sucrose },
        { weight: dextroseWeight, ingredient: dextrose },
        { weight: erythritolWeight, ingredient: erythritol },
        { weight: polydextroseWeight, ingredient: polydextrose },
        { weight: milkWeight, ingredient: milk },
        { weight: creamWeight, ingredient: cream },
      ],
      batchWeight
    );

    if (projectedSolidsPct > calibratedTargetSolidsPct + 0.05) {
      const excessSolidsGrams = ((projectedSolidsPct - calibratedTargetSolidsPct) / 100) * batchWeight;

      if (!locked.cream && !locked.milk) {
        const shift = Math.min(
          excessSolidsGrams /
            Math.max(
              ((cream.total_solids_pct ?? 41) - (milk.total_solids_pct ?? 12)) / 100,
              0.01
            ),
          creamWeight
        );
        creamWeight = Math.max(0, creamWeight - shift);
        milkWeight += shift;
      }
    } else if (projectedSolidsPct < calibratedTargetSolidsPct - 0.05 && !locked.cream && !locked.milk) {
      const deficitSolidsGrams = ((calibratedTargetSolidsPct - projectedSolidsPct) / 100) * batchWeight;
      const shift = Math.min(
        deficitSolidsGrams /
          Math.max(
            ((cream.total_solids_pct ?? 41) - (milk.total_solids_pct ?? 12)) / 100,
            0.01
          ),
        milkWeight
      );
      milkWeight = Math.max(0, milkWeight - shift);
      creamWeight += shift;
    }
  }

  const totalWeight =
    flavorWeight +
    totalbaseWeight +
    sucroseWeight +
    dextroseWeight +
    maltodextrinWeight +
    erythritolWeight +
    polydextroseWeight +
    nfdmWeight +
    milkWeight +
    creamWeight +
    waterWeight +
    coconutFatWeight;
  const weightDelta = batchWeight - totalWeight;

  if (Math.abs(weightDelta) > 0.1) {
    if ((baseType === "water" || useVeganMatrix) && !locked.water) {
      waterWeight = Math.max(0, waterWeight + weightDelta);
    } else if (!locked.milk) {
      milkWeight = Math.max(0, milkWeight + weightDelta);
    } else if (!locked.cream) {
      creamWeight = Math.max(0, creamWeight + weightDelta);
    } else if (!locked.sucrose) {
      sucroseWeight = Math.max(0, sucroseWeight + weightDelta);
    } else if (!locked.erythritol) {
      erythritolWeight = Math.max(0, erythritolWeight + weightDelta);
    }
  }

  const rows: LabIngredient[] = [
    {
      ...flavor,
      name: resolvedFlavor.ghost
        ? `[ SUGGESTED: ${translateIngredientName(flavor, language)} ]`
        : translateIngredientName(flavor, language),
      role: "flavor",
      grams: round(flavorWeight),
      locked: Boolean(locked.flavor),
      ghost: resolvedFlavor.ghost,
      suggestionCtaLabel: resolvedFlavor.ghost ? "Add to My Pantry" : null,
      suggestionNote: resolvedFlavor.suggestionNote ?? null,
    },
    ...(totalbaseWeight > 0
      ? [
          {
            ...totalbase,
            name: resolvedStructuralBase?.ghost
              ? "[ SUGGESTED: PreGel Fruttosa ]"
              : translateIngredientName(totalbase, language),
            role: "totalbase" as const,
            grams: round(totalbaseWeight),
            locked: true,
            ghost: Boolean(resolvedStructuralBase?.ghost),
            suggestionCtaLabel: resolvedStructuralBase?.ghost
              ? resolvedStructuralBase.suggestionCtaLabel ?? "Ingest Fruttosa"
              : null,
            suggestionNote: resolvedStructuralBase?.suggestionNote ?? null,
          },
        ]
      : []),
    ...(useVeganMatrix
      ? [
          {
            ...water,
            name: translateIngredientName(water, language),
            role: "water" as const,
            grams: round(waterWeight),
            locked: Boolean(locked.water),
          },
          {
            ...coconutFat,
            name: translateIngredientName(coconutFat, language),
            role: "coconutFat" as const,
            grams: round(coconutFatWeight),
            locked: Boolean(locked.coconutFat),
          },
        ]
      : baseType === "water"
        ? [
            {
              ...water,
              name: translateIngredientName(water, language),
              role: "water" as const,
              grams: round(waterWeight),
              locked: Boolean(locked.water),
            },
          ]
        : [
            {
              ...milk,
              name: translateIngredientName(milk, language),
              role: "milk" as const,
              grams: round(milkWeight),
              locked: Boolean(locked.milk),
            },
            {
              ...cream,
              name: translateIngredientName(cream, language),
              role: "cream" as const,
              grams: round(creamWeight),
              locked: Boolean(locked.cream),
            },
          ]),
    ...(useSugarFreeMatrix
      ? [
          {
            ...erythritol,
            name: translateIngredientName(erythritol, language),
            role: "erythritol" as const,
            grams: round(erythritolWeight),
            locked: Boolean(locked.erythritol),
          },
          {
            ...dextrose,
            name: translateIngredientName(dextrose, language),
            role: "dextrose" as const,
            grams: round(dextroseWeight),
            locked: Boolean(locked.dextrose),
          },
          {
            ...polydextrose,
            name: translateIngredientName(polydextrose, language),
            role: "polydextrose" as const,
            grams: round(polydextroseWeight),
            locked: Boolean(locked.polydextrose),
          },
        ]
      : [
          {
            ...sucrose,
            name: translateIngredientName(sucrose, language),
            role: "sucrose" as const,
            grams: round(sucroseWeight),
            locked: Boolean(locked.sucrose),
          },
          {
            ...dextrose,
            name: translateIngredientName(dextrose, language),
            role: "dextrose" as const,
            grams: round(dextroseWeight),
            locked: Boolean(locked.dextrose),
          },
          {
            ...maltodextrin,
            name: translateIngredientName(maltodextrin, language),
            role: "maltodextrin" as const,
            grams: round(maltodextrinWeight),
            locked: Boolean(locked.maltodextrin),
          },
        ]),
    ...(baseType === "water" || useVeganMatrix
      ? []
      : [
          {
            ...nfdm,
            name: translateIngredientName(nfdm, language),
            role: "nfdm" as const,
            grams: round(nfdmWeight),
            locked: isCleanLabel ? true : Boolean(locked.nfdm),
          },
        ]),
  ];

  const totals = rows.reduce(
    (acc, row) => {
      acc.fat += row.grams * ((row.fat_pct ?? 0) / 100);
      acc.sugar += row.grams * ((row.sugar_pct ?? 0) / 100);
      acc.solids += row.grams * ((row.total_solids_pct ?? row.sugar_pct ?? 0) / 100);
      acc.weight += row.grams;
      return acc;
    },
    { fat: 0, sugar: 0, solids: 0, weight: 0 }
  );

  const primarySweetenerWeight = useSugarFreeMatrix ? erythritolWeight : sucroseWeight;
  const bodySugarWeight = useSugarFreeMatrix ? polydextroseWeight : 0;
  const metrics: LabMetrics = {
    fat: round((totals.fat / batchWeight) * 100),
    sugar: round((totals.sugar / batchWeight) * 100),
    solids: round((totals.solids / batchWeight) * 100),
    pac: round(
      computeHudPac(
        archetype.pac,
        (totals.sugar / batchWeight) * 100,
        archetype.sugar,
        dextroseWeight,
        bodySugarWeight,
        batchWeight
      )
    ),
    pod: round(
      computeHudPod(
        archetype.pod,
        (totals.sugar / batchWeight) * 100,
        archetype.sugar,
        primarySweetenerWeight,
        bodySugarWeight,
        batchWeight
      )
    ),
  };

  const assistantHint = null;

  return {
    rows,
    metrics,
    flavor,
    batchWeight,
    archetype,
    ghostFlavor: resolvedFlavor.ghost ? flavor : null,
    assistantHint,
  };
}

export function useRecipeLab(ingredients: MobileIngredient[], language: MobileLanguage) {
  const [keyword, setKeyword] = useState("Pistachio");
  const [archetypeKey, setArchetypeKey] = useState<keyof typeof ARCHETYPES>("high-fat");
  const [baseType, setBaseType] = useState<BaseType>("dairy");
  const [batchLiters, setBatchLiters] = useState(1);
  const [flavorIntensityPct, setFlavorIntensityPct] = useState(10);
  const [podBias, setPodBias] = useState(1);
  const [manualWeights, setManualWeights] = useState<Partial<Record<IngredientRole, number>>>({});
  const [locked, setLocked] = useState<Partial<Record<IngredientRole, boolean>>>({});
  const [ingredientOverrides, setIngredientOverrides] = useState<
    Partial<Record<IngredientRole, MobileIngredient>>
  >({});
  const [removedRoles, setRemovedRoles] = useState<Partial<Record<IngredientRole, boolean>>>({});
  const [assistantMessage, setAssistantMessage] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<Snapshot | null>(null);

  const recipe = useMemo(
    () =>
      buildRecipeState(
        ingredients,
        keyword,
        archetypeKey,
        baseType,
        batchLiters,
        flavorIntensityPct,
        podBias,
        manualWeights,
        locked,
        ingredientOverrides,
        removedRoles,
        language
      ),
    [
      ingredients,
      keyword,
      archetypeKey,
      baseType,
      batchLiters,
      flavorIntensityPct,
      podBias,
      manualWeights,
      locked,
      ingredientOverrides,
      removedRoles,
      language,
    ]
  );

  const totalRecipeCost = useMemo(
    () =>
      recipe.rows.reduce(
        (sum, ingredient) => sum + calculateIngredientCost(ingredient, ingredient.grams),
        0
      ),
    [recipe.rows]
  );

  const proactiveAlert =
    recipe.metrics.solids > 45
      ? "Maestro here. Your solids look high—shall I reduce the Milk Powder?"
      : recipe.metrics.solids < 30
        ? "Maestro here. The body looks icy—shall I raise the solids?"
        : null;

  const assistantHint = proactiveAlert ?? recipe.assistantHint;

  const snapshot = useCallback(
    (): Snapshot => ({
      keyword,
      archetypeKey,
      baseType,
      batchLiters,
      flavorIntensityPct,
      podBias,
      manualWeights,
      locked,
      ingredientOverrides,
      removedRoles,
    }),
    [
      archetypeKey,
      baseType,
      batchLiters,
      flavorIntensityPct,
      keyword,
      locked,
      manualWeights,
      podBias,
      ingredientOverrides,
      removedRoles,
    ]
  );

  const restoreSnapshot = useCallback((value: Snapshot) => {
    setKeyword(value.keyword);
    setArchetypeKey(value.archetypeKey);
    setBaseType(value.baseType);
    setBatchLiters(value.batchLiters);
    setFlavorIntensityPct(value.flavorIntensityPct);
    setPodBias(value.podBias);
    setManualWeights(value.manualWeights);
    setLocked(value.locked);
    setIngredientOverrides(value.ingredientOverrides);
    setRemovedRoles(value.removedRoles);
  }, []);

  const queueUndo = useCallback(
    (message: string) => {
      setUndoSnapshot(snapshot());
      setAssistantMessage(message);
    },
    [snapshot]
  );

  const clearAssistantMessage = useCallback(() => {
    setAssistantMessage(null);
  }, []);

  const updateManualWeight = useCallback(async (role: IngredientRole, grams: number) => {
    if (role === "totalbase") {
      return;
    }

    const nextValue = Math.max(0, grams);

    setManualWeights((current) => {
      if (current[role] === nextValue) {
        return current;
      }

      return {
        ...current,
        [role]: nextValue,
      };
    });
    await Haptics.selectionAsync();
  }, []);

  const toggleLock = useCallback(async (role: IngredientRole) => {
    if (role === "totalbase") {
      return;
    }

    setLocked((current) => ({
      ...current,
      [role]: !current[role],
    }));
    await Haptics.selectionAsync();
  }, []);

  const applyFlavorIntensity = useCallback(async (nextValue: number) => {
    const nextIntensity = clamp(round(nextValue), 4, 20);
    setFlavorIntensityPct((current) => (current === nextIntensity ? current : nextIntensity));
    await Haptics.selectionAsync();
  }, []);

  const setIngredientPercent = useCallback(
    async (role: IngredientRole, percent: number) => {
      if (role !== "flavor") {
        return;
      }

      const dosagePerKg =
        recipe.flavor.dosage_guideline_per_kg ??
        recipe.flavor.dosage_guideline ??
        FALLBACK_INGREDIENTS.flavor.dosage_guideline_per_kg ??
        100;
      const nextIntensity = clamp((percent * 100) / Math.max(dosagePerKg, 1), 4, 20);

      setFlavorIntensityPct((current) => {
        const nextValue = round(nextIntensity);
        return current === nextValue ? current : nextValue;
      });
      await Haptics.selectionAsync();
    },
    [recipe.flavor]
  );

  const setBatchLitersValue = useCallback(async (value: number) => {
    const nextValue = clamp(round(value), 0.5, 20);
    setBatchLiters((current) => (current === nextValue ? current : nextValue));
    await Haptics.selectionAsync();
  }, []);

  const setRoleIngredient = useCallback(
    async (role: IngredientRole, ingredient: MobileIngredient) => {
      setIngredientOverrides((current) => ({
        ...current,
        [role]: ingredient,
      }));
      setRemovedRoles((current) => ({
        ...current,
        [role]: false,
      }));
      if (role === "flavor") {
        setKeyword(ingredient.name);
      }
      await Haptics.selectionAsync();
    },
    []
  );

  const assignIngredient = useCallback(
    async (ingredient: MobileIngredient) => {
      const role = inferRoleForIngredient(ingredient, baseType, archetypeKey);
      await setRoleIngredient(role, ingredient);
      return role;
    },
    [archetypeKey, baseType, setRoleIngredient]
  );

  const removeIngredient = useCallback(
    async (identifier: string) => {
      const target =
        recipe.rows.find((row) => row.id === identifier) ??
        recipe.rows.find((row) => row.role === identifier);

      if (!target || target.ghost || target.role === "flavor" || target.role === "totalbase") {
        return;
      }

      setRemovedRoles((current) => ({
        ...current,
        [target.role]: true,
      }));
      setIngredientOverrides((current) => {
        const next = { ...current };
        delete next[target.role];
        return next;
      });
      setManualWeights((current) => {
        const next = { ...current };
        delete next[target.role];
        return next;
      });
      setLocked((current) => ({
        ...current,
        [target.role]: false,
      }));
      await Haptics.selectionAsync();
    },
    [recipe.rows]
  );

  const applyAssistantCommand = useCallback(
    async (command: string, setLanguage?: (language: MobileLanguage) => Promise<void>) => {
      const normalized = normalize(command);
      const before = snapshot();

      if (!normalized) {
        return;
      }

      if (/spanish|espanol/.test(normalized) && setLanguage) {
        await setLanguage("es");
        setAssistantMessage("Miracoli Assist switched the shell to Spanish.");
        setUndoSnapshot(before);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      if (/italiano|italian/.test(normalized) && setLanguage) {
        await setLanguage("it");
        setAssistantMessage("Miracoli Assist switched the shell to Italian.");
        setUndoSnapshot(before);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      if (/english/.test(normalized) && setLanguage) {
        await setLanguage("en");
        setAssistantMessage("Miracoli Assist switched the shell to English.");
        setUndoSnapshot(before);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      if (/5 liters|5 litres|make this 5/.test(normalized)) {
        setBatchLiters(5);
        queueUndo("Miracoli Assist scaled the batch to 5 liters.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      const literMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(liter|litre|liters|litres|l)/);
      if (literMatch) {
        setBatchLiters(clamp(Number(literMatch[1]), 0.5, 20));
        queueUndo(`Miracoli Assist scaled the batch to ${literMatch[1]} liters.`);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      if (/less sweet|lower sugar|reduce sweetness|make this less sweet/.test(normalized)) {
        setPodBias((current) => clamp(current * 0.85, 0.65, 1));
        queueUndo("Miracoli Assist lowered sweetness and leaned on structure sugars to hold the PAC.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      if (/fix texture|sandy|chalky|powdery/.test(normalized)) {
        if (recipe.metrics.solids < 36 && !locked.nfdm) {
          setManualWeights((current) => ({
            ...current,
            nfdm: (current.nfdm ?? 35) + 5,
          }));
          queueUndo("Miracoli Assist increased NFDM by 5g to tighten the body.");
        } else {
          setAssistantMessage("The body is already dense. I would reduce NFDM before adding more.");
          setUndoSnapshot(before);
        }
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      setAssistantMessage("Try: lower the sugar, make this 5 liters, or switch to Italian.");
      setUndoSnapshot(before);
    },
    [locked.nfdm, queueUndo, recipe.metrics.solids, snapshot]
  );

  const undoAssistantChange = useCallback(async () => {
    if (!undoSnapshot) {
      return;
    }

    restoreSnapshot(undoSnapshot);
    setAssistantMessage(null);
    setUndoSnapshot(null);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [restoreSnapshot, undoSnapshot]);

  return {
    keyword,
    setKeyword,
    archetypeKey,
    setArchetypeKey,
    baseType,
    setBaseType,
    batchLiters,
    setBatchLiters: setBatchLitersValue,
    batchWeightGrams: recipe.batchWeight,
    flavorIntensityPct,
    applyFlavorIntensity,
    setIngredientPercent,
    ingredients: recipe.rows,
    metrics: recipe.metrics,
    totalRecipeCost,
    activeFlavor: recipe.flavor,
    ghostFlavorIngredient: recipe.ghostFlavor,
    equipmentLabel: "Bravo Trittico",
    proactiveAlert,
    assistantHint,
    assistantMessage,
    clearAssistantMessage,
    updateManualWeight,
    toggleLock,
    setRoleIngredient,
    assignIngredient,
    removeIngredient,
    applyAssistantCommand,
    undoAssistantChange,
  };
}
