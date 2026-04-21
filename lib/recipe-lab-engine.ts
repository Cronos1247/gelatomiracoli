export type RecipeArchetypeKey =
  | "milk-based-standard"
  | "high-fat"
  | "fruit-sorbet"
  | "low-sugar"
  | "clean-label"
  | "vegan"
  | "sugar-free";

export type RecipeBaseType = "dairy" | "water";

export type RecipeIngredientRole =
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

type SugarConfig = {
  role: SugarRole;
  ingredient: RecipeEngineIngredient;
  share: number;
};

export type RecipeEngineIngredient = {
  id?: string;
  name: string;
  category?: string | null;
  is_flavor?: boolean | null;
  is_base_ingredient?: boolean | null;
  fat_pct?: number | null;
  sugar_pct?: number | null;
  total_solids_pct?: number | null;
  water_pct?: number | null;
  pac_value?: number | null;
  pod_value?: number | null;
  dosage_guideline_per_kg?: number | null;
  dosage_guideline?: number | null;
  cost_per_container?: number | null;
  container_size_g?: number | null;
  average_market_cost?: number | null;
  is_master?: boolean | null;
  status?: string | null;
};

export type RecipeArchetype = {
  key: RecipeArchetypeKey;
  label: string;
  subtitle: string;
  fat: number;
  sugar: number;
  solids: number;
  pac: number;
  pod: number;
};

export type RecipeLabMetrics = {
  fat: number;
  sugar: number;
  solids: number;
  pac: number;
  pod: number;
};

export type RecipeLabRow = RecipeEngineIngredient & {
  role: RecipeIngredientRole;
  grams: number;
  locked: boolean;
  ghost?: boolean;
  suggestionCtaLabel?: string | null;
  suggestionNote?: string | null;
};

export type RecipeLabState = {
  rows: RecipeLabRow[];
  metrics: RecipeLabMetrics;
  flavor: RecipeEngineIngredient;
  batchWeight: number;
  archetype: RecipeArchetype;
  ghostFlavor: RecipeEngineIngredient | null;
  totalCost: number;
};

export type RecipeLabBuildInput = {
  ingredients: RecipeEngineIngredient[];
  keyword: string;
  archetypeKey: RecipeArchetypeKey;
  baseType: RecipeBaseType;
  batchLiters: number;
  flavorIntensityPct: number;
  podBias: number;
  manualWeights: Partial<Record<RecipeIngredientRole, number>>;
  locked: Partial<Record<RecipeIngredientRole, boolean>>;
  ingredientOverrides: Partial<Record<RecipeIngredientRole, RecipeEngineIngredient>>;
  removedRoles: Partial<Record<RecipeIngredientRole, boolean>>;
};

type ResolvedFlavor = {
  ingredient: RecipeEngineIngredient;
  ghost: boolean;
  suggestionNote?: string | null;
};

type ResolvedStructuralBase = {
  ingredient: RecipeEngineIngredient;
  ghost: boolean;
  suggestionNote?: string | null;
  suggestionCtaLabel?: string | null;
};

export const RECIPE_ARCHETYPES: Record<RecipeArchetypeKey, RecipeArchetype> = {
  "milk-based-standard": {
    key: "milk-based-standard",
    label: "Classic Crema",
    subtitle: "Classic crema and everyday gelato service",
    fat: 8.5,
    sugar: 18,
    solids: 38,
    pac: 245,
    pod: 17,
  },
  "high-fat": {
    key: "high-fat",
    label: "Rich Chocolate / Nut",
    subtitle: "Built for cocoa butter, pistachio, and hazelnut load",
    fat: 12,
    sugar: 17,
    solids: 40,
    pac: 235,
    pod: 16,
  },
  "fruit-sorbet": {
    key: "fruit-sorbet",
    label: "Fresh Fruit Sorbet",
    subtitle: "Bright fruit service with low fat and higher PAC",
    fat: 0.5,
    sugar: 29,
    solids: 31,
    pac: 290,
    pod: 28,
  },
  "low-sugar": {
    key: "low-sugar",
    label: "Custom Lab",
    subtitle: "Lower sweetness with structure support sugars",
    fat: 9,
    sugar: 12,
    solids: 36,
    pac: 240,
    pod: 13,
  },
  "clean-label": {
    key: "clean-label",
    label: "From Scratch",
    subtitle: "From-scratch artisan build with raw structure ingredients",
    fat: 8.5,
    sugar: 17,
    solids: 36,
    pac: 238,
    pod: 16,
  },
  vegan: {
    key: "vegan",
    label: "Vegan Structure",
    subtitle: "Cocoa-water or nut-water structure without lactose",
    fat: 9,
    sugar: 17,
    solids: 38,
    pac: 240,
    pod: 15,
  },
  "sugar-free": {
    key: "sugar-free",
    label: "Sugar-Free",
    subtitle: "Polyol-led softness with restrained POD",
    fat: 9,
    sugar: 11,
    solids: 36,
    pac: 245,
    pod: 9,
  },
};

const TOTAL_BASE_DOSAGE = 100;
const FRUTTOSA_DOSAGE = 50;
const CLEAN_LABEL_SMP_DOSAGE = 35;
const CLEAN_LABEL_BINDER_DOSAGE = 4;
const CLEAN_LABEL_PECTIN_DOSAGE = 8;

const FALLBACK_INGREDIENTS: Record<RecipeIngredientRole, RecipeEngineIngredient> = {
  flavor: {
    name: "Pistachio Paste (Pure)",
    category: "Flavor Paste",
    fat_pct: 45,
    sugar_pct: 5,
    total_solids_pct: 98,
    pac_value: 5,
    pod_value: 5,
    dosage_guideline_per_kg: 100,
    is_master: true,
  },
  milk: {
    name: "Whole Milk",
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
    category: "Sugar",
    fat_pct: 0,
    sugar_pct: 5,
    total_solids_pct: 100,
    pac_value: 0.25,
    pod_value: 0.05,
    is_master: true,
  },
};

const FALLBACK_FRUTTOSA_BASE: RecipeEngineIngredient = {
  name: "PreGel Fruttosa",
  category: "Fruit Base",
  fat_pct: 0,
  sugar_pct: 80,
  total_solids_pct: 91.9,
  pac_value: 81.43,
  pod_value: 80.23,
  dosage_guideline_per_kg: FRUTTOSA_DOSAGE,
  dosage_guideline: FRUTTOSA_DOSAGE,
  is_master: true,
  status: "draft",
};

const CLEAN_LABEL_BINDER: RecipeEngineIngredient = {
  name: "Locust Bean Gum / Guar Blend",
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
  is_master: true,
  status: "verified",
};

const CLEAN_LABEL_PECTIN: RecipeEngineIngredient = {
  name: "Pectin",
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
    RecipeEngineIngredient,
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

function shareToWeight(targetSugarGrams: number, share: number, ingredient: RecipeEngineIngredient) {
  const sugarRatio = Math.max((ingredient.sugar_pct ?? 0) / 100, 0.05);
  return (targetSugarGrams * share) / sugarRatio;
}

function findIngredient(
  ingredients: RecipeEngineIngredient[],
  matcher: (ingredient: RecipeEngineIngredient) => boolean,
  fallback: RecipeEngineIngredient
) {
  return ingredients.find(matcher) ?? fallback;
}

function resolveIngredientOverride(
  role: RecipeIngredientRole,
  overrides: Partial<Record<RecipeIngredientRole, RecipeEngineIngredient>>,
  fallback: RecipeEngineIngredient
) {
  return overrides[role] ?? fallback;
}

export function inferRoleForIngredient(
  ingredient: RecipeEngineIngredient,
  baseType: RecipeBaseType,
  archetypeKey: RecipeArchetypeKey
): RecipeIngredientRole {
  const name = normalize(ingredient.name);
  const category = normalize(ingredient.category ?? "");

  if (ingredient.is_flavor || /flavor|paste|fresh fruit|fruit/.test(category)) {
    return "flavor";
  }

  if (/water/.test(name)) return "water";
  if (/skim milk powder|smp|nfdm|milk powder/.test(name)) return "nfdm";
  if (/heavy cream|panna|cream/.test(name)) return "cream";
  if (/whole milk|latte|milk/.test(name)) return "milk";
  if (/maltodextrin/.test(name)) return "maltodextrin";
  if (/erythritol/.test(name)) return "erythritol";
  if (/polydextrose/.test(name)) return "polydextrose";
  if (/dextrose/.test(name)) return "dextrose";
  if (/sucrose|standard sugar|sugar/.test(name)) return "sucrose";
  if (/coconut fat|coconut oil|cocoa butter/.test(name)) return "coconutFat";

  if (
    /stabilizer|stabiliser|pectin|locust bean gum|guar|lbg|fruttosa|totalbase|base/.test(name) ||
    /structure|base\/stabilizer|fruit base/.test(category)
  ) {
    return "totalbase";
  }

  if (baseType === "water" || archetypeKey === "fruit-sorbet") {
    return "flavor";
  }

  return "flavor";
}

export function getFlavorCandidates(ingredients: RecipeEngineIngredient[]) {
  const candidates = ingredients.filter(
    (ingredient) =>
      ingredient.is_flavor === true ||
      /flavor|paste|fruit|nut|chocolate|cocoa/i.test(ingredient.category ?? "") ||
      /pistachio|pistacchio|hazelnut|nocciola|chocolate|cocoa|strawberry|fragola|mango|lemon|sorbet/i.test(
        ingredient.name
      )
  );

  return candidates.length ? candidates : ingredients;
}

function resolveFlavorIngredient(
  ingredients: RecipeEngineIngredient[],
  keyword: string,
  archetypeKey: RecipeArchetypeKey,
  overrides: Partial<Record<RecipeIngredientRole, RecipeEngineIngredient>>
): ResolvedFlavor {
  if (overrides.flavor) {
    return { ingredient: overrides.flavor, ghost: false };
  }

  const flavorCandidates = getFlavorCandidates(ingredients);
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

  return { ingredient: FALLBACK_INGREDIENTS.flavor, ghost: false };
}

function resolveStructuralBaseIngredient(
  ingredients: RecipeEngineIngredient[],
  baseType: RecipeBaseType,
  archetypeKey: RecipeArchetypeKey,
  overrides: Partial<Record<RecipeIngredientRole, RecipeEngineIngredient>>
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
        ingredients.find((item) => /locust bean gum|guar blend|guar gum|lbg/i.test(item.name)) ??
        CLEAN_LABEL_BINDER;
      return { ingredient: binder, ghost: false };
    }

    if (baseType === "water" && !useVeganMatrix) {
      const pectin = ingredients.find((item) => /pectin/i.test(item.name)) ?? CLEAN_LABEL_PECTIN;
      return { ingredient: pectin, ghost: false };
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
        (item) => /(^|\s)fruttosa(\s|$)/i.test(item.name) || /fruit base/i.test(item.category ?? "")
      );

    if (fruitBase) {
      return { ingredient: fruitBase, ghost: false };
    }

    return {
      ingredient: FALLBACK_FRUTTOSA_BASE,
      ghost: true,
      suggestionCtaLabel: "Ingest Fruttosa",
      suggestionNote: "Suggested structural fruit base while your pantry is missing Fruttosa.",
    };
  }

  return null;
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

  return clamp(
    targetPac + (sugarPct - targetSugarPct) * 4 + dextrosePct * 7 - bodyPct * 6,
    180,
    320
  );
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

  return clamp(
    targetPod + (sugarPct - targetSugarPct) * 0.5 + primarySweetenerPct * 0.1 - bodyPct * 0.4,
    8,
    30
  );
}

function computeProjectedSolidsPct(
  components: Array<{ weight: number; ingredient: RecipeEngineIngredient }>,
  batchWeight: number
) {
  const solids = components.reduce(
    (sum, component) =>
      sum +
      component.weight *
        ((component.ingredient.total_solids_pct ?? component.ingredient.sugar_pct ?? 0) / 100),
    0
  );

  return (solids / Math.max(batchWeight, 1)) * 100;
}

function solveMilkCream(
  totalWeight: number,
  targetFatGrams: number,
  milk: RecipeEngineIngredient,
  cream: RecipeEngineIngredient,
  lockedMilk: number | null,
  lockedCream: number | null
) {
  const milkFatRatio = (milk.fat_pct ?? 0) / 100;
  const creamFatRatio = (cream.fat_pct ?? 0) / 100;

  if (lockedMilk !== null && lockedCream !== null) {
    return { milk: lockedMilk, cream: lockedCream };
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

export function buildRecipeLabState({
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
}: RecipeLabBuildInput): RecipeLabState {
  const archetype = RECIPE_ARCHETYPES[archetypeKey];
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
    findIngredient(
      ingredients,
      (item) => /coconut fat|coconut oil|cocoa butter/i.test(item.name),
      FALLBACK_INGREDIENTS.coconutFat
    )
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
    maltodextrin: removedRoles.maltodextrin
      ? 0
      : locked.maltodextrin
        ? manualWeights.maltodextrin ?? 0
        : 0,
    erythritol: removedRoles.erythritol ? 0 : locked.erythritol ? manualWeights.erythritol ?? 0 : 0,
    polydextrose: removedRoles.polydextrose
      ? 0
      : locked.polydextrose
        ? manualWeights.polydextrose ?? 0
        : 0,
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
      : isCleanLabel && baseType === "dairy" && !useVeganMatrix
        ? batchLiters *
          (nfdm.dosage_guideline_per_kg ?? nfdm.dosage_guideline ?? CLEAN_LABEL_SMP_DOSAGE)
        : 0;

  let milkWeight = removedRoles.milk ? 0 : locked.milk ? manualWeights.milk ?? 0 : manualWeights.milk ?? 0;
  let creamWeight = removedRoles.cream
    ? 0
    : locked.cream
      ? manualWeights.cream ?? 0
      : manualWeights.cream ?? 0;
  let waterWeight = removedRoles.water ? 0 : locked.water ? manualWeights.water ?? 0 : manualWeights.water ?? 0;
  let coconutFatWeight =
    removedRoles.coconutFat
      ? 0
      : locked.coconutFat
        ? manualWeights.coconutFat ?? 0
        : manualWeights.coconutFat ?? 0;

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
            Math.max(((cream.total_solids_pct ?? 41) - (milk.total_solids_pct ?? 12)) / 100, 0.01),
          creamWeight
        );
        creamWeight = Math.max(0, creamWeight - shift);
        milkWeight += shift;
      }
    } else if (projectedSolidsPct < calibratedTargetSolidsPct - 0.05 && !locked.cream && !locked.milk) {
      const deficitSolidsGrams = ((calibratedTargetSolidsPct - projectedSolidsPct) / 100) * batchWeight;
      const shift = Math.min(
        deficitSolidsGrams /
          Math.max(((cream.total_solids_pct ?? 41) - (milk.total_solids_pct ?? 12)) / 100, 0.01),
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

  const rows: RecipeLabRow[] = [
    {
      ...flavor,
      role: "flavor" as const,
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
            role: "water" as const,
            grams: round(waterWeight),
            locked: Boolean(locked.water),
          },
          {
            ...coconutFat,
            role: "coconutFat" as const,
            grams: round(coconutFatWeight),
            locked: Boolean(locked.coconutFat),
          },
        ]
      : baseType === "water"
        ? [
            {
              ...water,
              role: "water" as const,
              grams: round(waterWeight),
              locked: Boolean(locked.water),
            },
          ]
        : [
            {
              ...milk,
              role: "milk" as const,
              grams: round(milkWeight),
              locked: Boolean(locked.milk),
            },
            {
              ...cream,
              role: "cream" as const,
              grams: round(creamWeight),
              locked: Boolean(locked.cream),
            },
          ]),
    ...(useSugarFreeMatrix
      ? [
          {
            ...erythritol,
            role: "erythritol" as const,
            grams: round(erythritolWeight),
            locked: Boolean(locked.erythritol),
          },
          {
            ...dextrose,
            role: "dextrose" as const,
            grams: round(dextroseWeight),
            locked: Boolean(locked.dextrose),
          },
          {
            ...polydextrose,
            role: "polydextrose" as const,
            grams: round(polydextroseWeight),
            locked: Boolean(locked.polydextrose),
          },
        ]
      : [
          {
            ...sucrose,
            role: "sucrose" as const,
            grams: round(sucroseWeight),
            locked: Boolean(locked.sucrose),
          },
          {
            ...dextrose,
            role: "dextrose" as const,
            grams: round(dextroseWeight),
            locked: Boolean(locked.dextrose),
          },
          {
            ...maltodextrin,
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
            role: "nfdm" as const,
            grams: round(nfdmWeight),
            locked: isCleanLabel ? true : Boolean(locked.nfdm),
          },
        ]),
  ].filter((row) => row.grams > 0 || row.role === "flavor");

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
  const metrics: RecipeLabMetrics = {
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

  const totalCost = rows.reduce(
    (sum, ingredient) => sum + calculateIngredientCost(ingredient, ingredient.grams),
    0
  );

  return {
    rows,
    metrics,
    flavor,
    batchWeight,
    archetype,
    ghostFlavor: resolvedFlavor.ghost ? flavor : null,
    totalCost,
  };
}
