import {
  defaultEquipment,
  defaultIngredients,
  defaultStabilizers,
  flavorProfiles,
  sugarOptions,
  type BaseType,
  type CustomIngredientInput,
  type DisplayType,
  type Equipment,
  type FlavorKey,
  type FlavorProfile,
  type Ingredient,
  type IngredientDataPriority,
  type Stabilizer,
  type SugarOption,
} from "@/lib/default-data";
import { calculateEconomics, resolveIngredientCost, type IngredientPriceLookup } from "@/lib/economics";
import type { CostMode, PricingSettings } from "@/lib/storage";
import { resolveFlavorArchetype } from "@/lib/template-engine";

export const TARGET_PROFILES = {
  Gelato: {
    fatPct: { min: 8, max: 12, target: 9.4 },
    sugarPct: { min: 16, max: 22, target: 18.2 },
    totalSolidsPct: { min: 36, max: 40, target: 38 },
    pac: { min: 240, max: 260, target: 250 },
  },
  Sorbet: {
    fatPct: { min: 0, max: 1, target: 0.4 },
    sugarPct: { min: 25, max: 30, target: 27.5 },
    totalSolidsPct: { min: 29, max: 33, target: 31 },
    pac: { min: 280, max: 310, target: 295 },
  },
} as const;

export type TargetProfileKey = keyof typeof TARGET_PROFILES;

export const ARCHETYPES = {
  "milk-based-standard": {
    label: "Classic Crema",
    description: "Milk-first gelato with a Fellini-style dairy curve and classic scoop physics.",
    targetFatPct: 8.5,
    targetSugarPct: 18,
    targetSolidsPct: 38,
    targetPac: 245,
    targetPodPct: 17,
    recipeStyle: "Gelato" as const,
  },
  "high-fat-chocolate-nut": {
    label: "Rich Chocolate/Nut",
    description: "Designed for cocoa butter, nut oils, and dense paste loads without greasy overshoot.",
    targetFatPct: 12,
    targetSugarPct: 17,
    targetSolidsPct: 40,
    targetPac: 235,
    targetPodPct: 16,
    recipeStyle: "Gelato" as const,
  },
  "fruit-sorbet": {
    label: "Fresh Fruit Sorbet",
    description: "Cold-served fruit balance with bright sweetness, softer solids, and sorbet PAC.",
    targetFatPct: 0.5,
    targetSugarPct: 29,
    targetSolidsPct: 31,
    targetPac: 290,
    targetPodPct: 28,
    recipeStyle: "Sorbet" as const,
  },
  "low-sugar-modern": {
    label: "Custom Lab",
    description: "Modern lower-sugar structure with tighter sweetness and a cleaner finish.",
    targetFatPct: 9,
    targetSugarPct: 12,
    targetSolidsPct: 36,
    targetPac: 240,
    targetPodPct: 13,
    recipeStyle: "Gelato" as const,
  },
} as const;

export type ArchetypeKey = keyof typeof ARCHETYPES;

export type BalancedIngredient = {
  name: string;
  grams: number;
  percentage: number;
  costPerKg: number;
  totalCost: number;
};

export type BalancedWarning = {
  title: string;
  message: string;
};

export type BalancedMetrics = {
  fatPct: number;
  sugarPct: number;
  pac: number;
  pacRange: { min: number; max: number };
  podPct: number;
  solidsPct: number;
  totalBatchCost: number;
  costPerKg: number;
  costPerLiter: number;
  estimatedMarginPct: number;
  suggestedRetailPerLiter: number;
  suggestedRetailPerPint: number;
  suggestedRetailPerScoop: number;
  currency: string;
  densityKgPerL: number;
};

export type BalancedRecipe = {
  title: string;
  baseType: BaseType;
  flavorKey: FlavorKey;
  totalMixWeight: number;
  estimatedVolumeLiters: number;
  overrunPct: number;
  stabilizer: Stabilizer;
  fixedIngredientNotes: string[];
  logicPriority: {
    verifiedLabDataCount: number;
    proxyModeCount: number;
    industryAverageCount: number;
  };
  warnings: BalancedWarning[];
  targetProfile: TargetProfileKey;
  ingredients: BalancedIngredient[];
  metrics: BalancedMetrics;
};

export type BalanceGelatoOptions = {
  targetBatchKg: number;
  flavorProfile: FlavorProfile | FlavorKey;
  baseType: BaseType;
  displayType: DisplayType;
  equipment?: Equipment;
  ingredientLibrary?: Ingredient[];
  stabilizerLibrary?: Stabilizer[];
  availableSugars?: SugarOption[];
  intensity?: number;
  targetFatPct?: number;
  targetPac?: number;
  targetPodPct?: number;
  targetSolidsPct?: number;
  overrunPct?: number;
  retailPricePerLiter?: number;
  targetMarginPct?: number;
  priceLookup?: IngredientPriceLookup;
  economicsMode?: CostMode;
  pricing?: PricingSettings;
  customIngredients?: CustomIngredientInput[];
  sugarReduction?: boolean;
  pantryStock?: Partial<Record<string, boolean>>;
  recipeStyle?: TargetProfileKey;
};

export type RebalanceRecipeOptions = {
  baseIngredients: {
    milk: Ingredient;
    cream: Ingredient;
    sugars: Ingredient[];
    nfdm?: Ingredient | null;
  };
  flavorPaste: {
    name: string;
    grams: number;
    fat_pct: number;
    sugar_pct: number;
    solids_non_fat_pct: number;
    other_solids_pct: number;
    pac_value: number;
    pod_value: number;
    cost_per_kg: number;
    data_priority?: IngredientDataPriority;
  };
  flavorComponents?: Array<{
    name: string;
    grams: number;
    fat_pct: number;
    sugar_pct: number;
    solids_non_fat_pct: number;
    other_solids_pct: number;
    pac_value: number;
    pod_value: number;
    cost_per_kg: number;
    data_priority?: IngredientDataPriority;
  }>;
  targetTotalWeight: number;
  displayType: DisplayType;
  targetProfile: TargetProfileKey;
  stabilizer: Stabilizer;
  selectedEquipment: Equipment;
  customIngredients?: CustomIngredientInput[];
  targetFatPct?: number;
  targetPac?: number;
  targetPodPct?: number;
  targetSolidsPct?: number;
  overrunPct?: number;
  retailPricePerLiter?: number;
  targetMarginPct?: number;
  priceLookup?: IngredientPriceLookup;
  economicsMode?: CostMode;
  pricing?: PricingSettings;
  sugarReduction?: boolean;
  selectedBaseType: BaseType;
  requestedBaseType: BaseType;
  flavorIngredients?: Array<{ data_priority?: IngredientDataPriority }>;
};

const REQUIRED_INGREDIENTS = ["Whole Milk", "Heavy Cream", "NFDM"] as const;
const SUGAR_REDUCTION_FACTOR = 0.82;
const STABILIZER_COST_PER_KG = 18;

type BaseIngredientKey = (typeof REQUIRED_INGREDIENTS)[number];

type Totals = {
  fat: number;
  sugar: number;
  solids: number;
  pac: number;
  podAbs: number;
  cost: number;
  weight: number;
};

type SugarBlendItem = {
  ingredient: Ingredient;
  grams: number;
};

type SugarSolution = {
  ingredients: SugarBlendItem[];
  pac: number;
  podAbs: number;
  sugar: number;
  solids: number;
  cost: number;
  score: number;
};

type DairySolution = {
  milk: number;
  cream: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lookupFlavorProfile(flavorProfile: FlavorProfile | FlavorKey) {
  return typeof flavorProfile === "string" ? flavorProfiles[flavorProfile] : flavorProfile;
}

function getPriorityRank(priority: IngredientDataPriority) {
  if (priority === "verified_lab_data") {
    return 3;
  }

  if (priority === "proxy_mode") {
    return 2;
  }

  return 1;
}

function buildIngredientMap(library: Ingredient[]) {
  const merged = new Map<string, Ingredient>();

  for (const ingredient of defaultIngredients) {
    merged.set(ingredient.name, ingredient);
  }

  for (const ingredient of library) {
    const existing = merged.get(ingredient.name);

    if (!existing || getPriorityRank(ingredient.data_priority) >= getPriorityRank(existing.data_priority)) {
      merged.set(ingredient.name, ingredient);
    }
  }

  return merged;
}

function getBaseIngredients(library: Ingredient[]) {
  const ingredientMap = buildIngredientMap(library);
  const result = {} as Record<BaseIngredientKey, Ingredient>;

  for (const key of REQUIRED_INGREDIENTS) {
    result[key] = ingredientMap.get(key) ?? defaultIngredients.find((item) => item.name === key)!;
  }

  return result;
}

function ingredientSolidsRate(ingredient: {
  fat_pct: number;
  sugar_pct: number;
  solids_non_fat_pct: number;
  other_solids_pct: number;
}) {
  return (
    ingredient.fat_pct +
    ingredient.sugar_pct +
    ingredient.solids_non_fat_pct +
    ingredient.other_solids_pct
  ) / 100;
}

function computeFixedTotals(
  flavor: FlavorProfile,
  targetMixWeight: number,
  intensity: number,
  customIngredients: CustomIngredientInput[]
) {
  const fixedFlavorIngredients = flavor.fixedIngredients.map((item) => ({
    ...item,
    name: item.name,
    grams: (item.grams_per_kg_mix * targetMixWeight * intensity) / 1000,
  }));

  const fixedCustomIngredients = customIngredients
    .filter((item) => item.enabled && item.grams_per_kg_mix > 0)
    .map((item) => ({
      name: item.ingredient.name,
      grams: (item.grams_per_kg_mix * targetMixWeight) / 1000,
      fat_pct: item.ingredient.fat_pct,
      sugar_pct: item.ingredient.sugar_pct,
      solids_non_fat_pct: item.ingredient.solids_non_fat_pct,
      other_solids_pct: item.ingredient.other_solids_pct,
      pac_value: item.ingredient.pac_value,
      pod_value: item.ingredient.pod_value,
      cost_per_kg: item.ingredient.cost_per_kg,
      data_priority: item.ingredient.data_priority,
    }));

  const totals = [...fixedFlavorIngredients, ...fixedCustomIngredients].reduce<Totals>(
    (current, item) => {
      current.weight += item.grams;
      current.fat += item.grams * (item.fat_pct / 100);
      current.sugar += item.grams * (item.sugar_pct / 100);
      current.solids += item.grams * ingredientSolidsRate(item);
      current.pac += item.grams * (item.pac_value / 100);
      current.podAbs += item.grams * (item.pod_value / 100);
      current.cost += (item.grams / 1000) * item.cost_per_kg;
      return current;
    },
    { fat: 0, sugar: 0, solids: 0, pac: 0, podAbs: 0, cost: 0, weight: 0 }
  );

  return {
    totals,
    rows: [...fixedFlavorIngredients, ...fixedCustomIngredients],
  };
}

function solveCreamMilkSystem({
  dairyWeight,
  fatNeed,
  milk,
  cream,
}: {
  dairyWeight: number;
  fatNeed: number;
  milk: Ingredient;
  cream: Ingredient;
}) {
  const milkFatRate = milk.fat_pct / 100;
  const creamFatRate = cream.fat_pct / 100;
  const denominator = creamFatRate - milkFatRate;

  if (Math.abs(denominator) < 1e-6) {
    return null;
  }

  const creamWeight = (fatNeed - dairyWeight * milkFatRate) / denominator;
  const milkWeight = dairyWeight - creamWeight;

  if (
    !Number.isFinite(creamWeight) ||
    !Number.isFinite(milkWeight) ||
    creamWeight < 0 ||
    milkWeight < 0
  ) {
    return null;
  }

  return {
    cream: creamWeight,
    milk: milkWeight,
  } satisfies DairySolution;
}

function solveTwoSugarSystem(pacNeed: number, podNeedAbs: number, left: Ingredient, right: Ingredient) {
  const leftPac = left.pac_value / 100;
  const rightPac = right.pac_value / 100;
  const leftPod = left.pod_value / 100;
  const rightPod = right.pod_value / 100;
  const determinant = leftPac * rightPod - leftPod * rightPac;

  if (Math.abs(determinant) < 1e-6) {
    return null;
  }

  const leftGrams = (pacNeed * rightPod - podNeedAbs * rightPac) / determinant;
  const rightGrams = (podNeedAbs * leftPac - pacNeed * leftPod) / determinant;

  if (leftGrams < 0 || rightGrams < 0) {
    return null;
  }

  return [
    { ingredient: left, grams: leftGrams },
    { ingredient: right, grams: rightGrams },
  ] satisfies SugarBlendItem[];
}

function solveSingleSugarSystem(pacNeed: number, podNeedAbs: number, ingredient: Ingredient) {
  const pacPerGram = ingredient.pac_value / 100;

  if (pacPerGram <= 0) {
    return null;
  }

  const grams = pacNeed / pacPerGram;

  if (!Number.isFinite(grams) || grams <= 0) {
    return null;
  }

  const pac = grams * pacPerGram;
  const podAbs = grams * (ingredient.pod_value / 100);
  const sugar = grams * (ingredient.sugar_pct / 100);
  const solids = grams * ingredientSolidsRate(ingredient);

  return {
    ingredients: [{ ingredient, grams }],
    pac,
    podAbs,
    sugar,
    solids,
    cost: (grams / 1000) * ingredient.cost_per_kg,
    score: Math.abs(pac - pacNeed) + Math.abs(podAbs - podNeedAbs) * 1.5,
  } satisfies SugarSolution;
}

function computeSugarPreferenceScore(solution: SugarBlendItem[], sugarReduction: boolean) {
  if (!sugarReduction) {
    return 0;
  }

  const totalSugarGrams = solution.reduce((sum, item) => sum + item.grams, 0);

  if (!totalSugarGrams) {
    return 0;
  }

  const sucroseRatio =
    solution
      .filter((item) => item.ingredient.name === "Sucrose")
      .reduce((sum, item) => sum + item.grams, 0) / totalSugarGrams;
  const dextroseRatio =
    solution
      .filter((item) => item.ingredient.name === "Dextrose")
      .reduce((sum, item) => sum + item.grams, 0) / totalSugarGrams;
  const polydextroseRatio =
    solution
      .filter((item) => item.ingredient.name === "Polydextrose")
      .reduce((sum, item) => sum + item.grams, 0) / totalSugarGrams;
  const maltodextrinRatio =
    solution
      .filter((item) => item.ingredient.name === "Maltodextrin (DE19)")
      .reduce((sum, item) => sum + item.grams, 0) / totalSugarGrams;

  return sucroseRatio * 18 - dextroseRatio * 8 - polydextroseRatio * 16 - maltodextrinRatio * 14;
}

function solveSugarBlend(
  pacNeed: number,
  podNeedAbs: number,
  allowedSugars: Ingredient[],
  sugarReduction: boolean
): SugarSolution | null {
  const candidates: SugarSolution[] = [];

  for (let index = 0; index < allowedSugars.length; index += 1) {
    const single = solveSingleSugarSystem(pacNeed, podNeedAbs, allowedSugars[index]);

    if (single) {
      single.score += computeSugarPreferenceScore(single.ingredients, sugarReduction);
      candidates.push(single);
    }

    for (let pairIndex = index + 1; pairIndex < allowedSugars.length; pairIndex += 1) {
      const pair = solveTwoSugarSystem(pacNeed, podNeedAbs, allowedSugars[index], allowedSugars[pairIndex]);

      if (!pair) {
        continue;
      }

      const pac = pair.reduce((sum, item) => sum + item.grams * (item.ingredient.pac_value / 100), 0);
      const podAbs = pair.reduce((sum, item) => sum + item.grams * (item.ingredient.pod_value / 100), 0);
      const sugar = pair.reduce((sum, item) => sum + item.grams * (item.ingredient.sugar_pct / 100), 0);
      const solids = pair.reduce((sum, item) => sum + item.grams * ingredientSolidsRate(item.ingredient), 0);
      const cost = pair.reduce((sum, item) => sum + (item.grams / 1000) * item.ingredient.cost_per_kg, 0);

      candidates.push({
        ingredients: pair,
        pac,
        podAbs,
        sugar,
        solids,
        cost,
        score:
          Math.abs(pac - pacNeed) +
          Math.abs(podAbs - podNeedAbs) * 1.8 +
          computeSugarPreferenceScore(pair, sugarReduction),
      });
    }
  }

  return candidates.sort((left, right) => left.score - right.score)[0] ?? null;
}

function computeDensityKgPerL({ fatPct, solidsPct }: { fatPct: number; solidsPct: number }) {
  return 1.015 + solidsPct * 0.0014 + fatPct * 0.0012;
}

export function calculateOutputVolume({
  totalWeightKg,
  baseDensityKgPerL,
  overrunPct,
}: {
  totalWeightKg: number;
  baseDensityKgPerL: number;
  overrunPct: number;
}) {
  return (totalWeightKg / baseDensityKgPerL) * (1 + overrunPct / 100);
}

function getLogicPriorityCounts({
  milk,
  cream,
  sugars,
  flavorIngredients,
  customIngredients,
  nfdm,
}: {
  milk: Ingredient;
  cream: Ingredient;
  sugars: SugarBlendItem[];
  flavorIngredients: Array<{ data_priority?: IngredientDataPriority }>;
  customIngredients: CustomIngredientInput[];
  nfdm?: Ingredient | null;
}) {
  const counts = {
    verifiedLabDataCount: 0,
    proxyModeCount: 0,
    industryAverageCount: 0,
  };

  const bump = (priority: IngredientDataPriority) => {
    if (priority === "verified_lab_data") {
      counts.verifiedLabDataCount += 1;
      return;
    }

    if (priority === "proxy_mode") {
      counts.proxyModeCount += 1;
      return;
    }

    counts.industryAverageCount += 1;
  };

  bump(milk.data_priority);
  bump(cream.data_priority);

  if (nfdm) {
    bump(nfdm.data_priority);
  }

  for (const sugar of sugars) {
    bump(sugar.ingredient.data_priority);
  }

  for (const item of customIngredients.filter((candidate) => candidate.enabled && candidate.grams_per_kg_mix > 0)) {
    bump(item.ingredient.data_priority);
  }

  for (const item of flavorIngredients) {
    bump(item.data_priority ?? "industry_average");
  }

  return counts;
}

function getAdjustedTargetProfile(targetProfile: TargetProfileKey, displayType: DisplayType) {
  const base = TARGET_PROFILES[targetProfile];
  const pacOffset = displayType === "Pozzetti" ? 20 : 0;

  return {
    fatPct: base.fatPct,
    sugarPct: base.sugarPct,
    totalSolidsPct: base.totalSolidsPct,
    pac: {
      min: base.pac.min - pacOffset,
      max: base.pac.max - pacOffset,
      target: base.pac.target - pacOffset,
    },
  };
}

function getClosestColdProcessAlternative(stabilizer: Stabilizer, stabilizerLibrary: Stabilizer[]) {
  return (
    stabilizerLibrary
      .filter((item) => item.process_type === "Cold")
      .sort((left, right) => {
        const leftGap =
          Math.abs(left.dosage_range_min - stabilizer.dosage_range_min) +
          Math.abs(left.dosage_range_max - stabilizer.dosage_range_max);
        const rightGap =
          Math.abs(right.dosage_range_min - stabilizer.dosage_range_min) +
          Math.abs(right.dosage_range_max - stabilizer.dosage_range_max);

        return leftGap - rightGap;
      })[0] ?? null
  );
}

export function rebalanceRecipe({
  baseIngredients,
  flavorPaste,
  flavorComponents,
  targetTotalWeight,
  displayType,
  targetProfile,
  stabilizer,
  selectedEquipment,
  customIngredients = [],
  targetFatPct,
  targetPac,
  targetPodPct,
  targetSolidsPct,
  overrunPct = selectedEquipment.default_overrun_pct,
  retailPricePerLiter = 28,
  targetMarginPct = 75,
  priceLookup,
  economicsMode = "market_average",
  pricing,
  sugarReduction = false,
  selectedBaseType,
  requestedBaseType,
  flavorIngredients = [],
}: RebalanceRecipeOptions) {
  const warnings: BalancedWarning[] = [];
  const adjustedProfile = getAdjustedTargetProfile(targetProfile, displayType);
  const targetFatPercent = clamp(
    targetFatPct ?? adjustedProfile.fatPct.target,
    adjustedProfile.fatPct.min,
    adjustedProfile.fatPct.max
  );
  const targetSugarPercent = clamp(
    adjustedProfile.sugarPct.target * (sugarReduction ? 0.9 : 1),
    adjustedProfile.sugarPct.min,
    adjustedProfile.sugarPct.max
  );
  const targetSolidsPercent = clamp(
    targetSolidsPct ?? adjustedProfile.totalSolidsPct.target,
    adjustedProfile.totalSolidsPct.min,
    adjustedProfile.totalSolidsPct.max + 2
  );
  const effectiveTargetPac = clamp(
    targetPac ?? adjustedProfile.pac.target,
    adjustedProfile.pac.min,
    adjustedProfile.pac.max
  );
  const effectiveTargetPodPercent = clamp(
    targetPodPct ?? (sugarReduction ? targetSugarPercent * SUGAR_REDUCTION_FACTOR : targetSugarPercent),
    Math.max(0, adjustedProfile.sugarPct.min - 2),
    adjustedProfile.sugarPct.max + 2
  );

  if (requestedBaseType === "Hot" && !selectedEquipment.heating_capability) {
    warnings.push({
      title: "Hardware Incompatibility",
      message: `The selected equipment cannot run ${stabilizer.brand_name} ${stabilizer.product_name}. Switch to a cold-process stabilizer or choose heated equipment.`,
    });
  }

  const resolvedFlavorRows = flavorComponents?.length ? flavorComponents : [flavorPaste];
  const fixedCustomRows = customIngredients
    .filter((item) => item.enabled && item.grams_per_kg_mix > 0)
    .map((item) => ({
      name: item.ingredient.name,
      grams: (item.grams_per_kg_mix * targetTotalWeight) / 1000,
      fat_pct: item.ingredient.fat_pct,
      sugar_pct: item.ingredient.sugar_pct,
      solids_non_fat_pct: item.ingredient.solids_non_fat_pct,
      other_solids_pct: item.ingredient.other_solids_pct,
      pac_value: item.ingredient.pac_value,
      pod_value: item.ingredient.pod_value,
      cost_per_kg: resolveIngredientCost({
        ingredient: item.ingredient,
        priceLookup,
        costMode: economicsMode,
      }).effectiveCostPerKg,
    }));
  const fixedRows = [...resolvedFlavorRows, ...fixedCustomRows];
  const fixedTotals = fixedRows.reduce<Totals>(
    (current, item) => {
      current.weight += item.grams;
      current.fat += item.grams * (item.fat_pct / 100);
      current.sugar += item.grams * (item.sugar_pct / 100);
      current.solids += item.grams * ingredientSolidsRate(item);
      current.pac += item.grams * (item.pac_value / 100);
      current.podAbs += item.grams * (item.pod_value / 100);
      current.cost += (item.grams / 1000) * item.cost_per_kg;
      return current;
    },
    { fat: 0, sugar: 0, solids: 0, pac: 0, podAbs: 0, cost: 0, weight: 0 }
  );
  const flavorTotals = resolvedFlavorRows.reduce<Totals>(
    (current, item) => {
      current.weight += item.grams;
      current.fat += item.grams * (item.fat_pct / 100);
      current.sugar += item.grams * (item.sugar_pct / 100);
      current.solids += item.grams * ingredientSolidsRate(item);
      current.pac += item.grams * (item.pac_value / 100);
      current.podAbs += item.grams * (item.pod_value / 100);
      current.cost += (item.grams / 1000) * item.cost_per_kg;
      return current;
    },
    { fat: 0, sugar: 0, solids: 0, pac: 0, podAbs: 0, cost: 0, weight: 0 }
  );
  const stabilizerPct =
    selectedBaseType === "Cold"
      ? stabilizer.dosage_range_max
      : (stabilizer.dosage_range_min + stabilizer.dosage_range_max) / 2;
  const stabilizerWeight = targetTotalWeight * (stabilizerPct / 100);
  const stabilizerContribution = {
    weight: stabilizerWeight,
    solids: stabilizerWeight,
    cost: (stabilizerWeight / 1000) * STABILIZER_COST_PER_KG,
  };
  const milkCostPerKg = resolveIngredientCost({
    ingredient: baseIngredients.milk,
    priceLookup,
    costMode: economicsMode,
  }).effectiveCostPerKg;
  const creamCostPerKg = resolveIngredientCost({
    ingredient: baseIngredients.cream,
    priceLookup,
    costMode: economicsMode,
  }).effectiveCostPerKg;

  const pacNeed = (effectiveTargetPac / 100) * targetTotalWeight - fixedTotals.pac;
  const podNeedAbs = (effectiveTargetPodPercent / 100) * targetTotalWeight - fixedTotals.podAbs;
  const sugarBlend = solveSugarBlend(
    Math.max(pacNeed, 0.1),
    Math.max(podNeedAbs, 0.1),
    baseIngredients.sugars,
    sugarReduction
  );

  if (!sugarBlend) {
    throw new Error("Unable to solve the selected sugar system for PAC/POD.");
  }

  const sugarWeight = sugarBlend.ingredients.reduce((sum, item) => sum + item.grams, 0);
  const remainingDairyBaseWeight = targetTotalWeight - fixedTotals.weight - stabilizerWeight - sugarWeight;
  const remainingFatTarget = (targetFatPercent / 100) * targetTotalWeight - fixedTotals.fat;
  const dairySolution = solveCreamMilkSystem({
    dairyWeight: remainingDairyBaseWeight,
    fatNeed: remainingFatTarget,
    milk: baseIngredients.milk,
    cream: baseIngredients.cream,
  });

  if (!dairySolution) {
    throw new Error("Unable to solve the milk and cream system for the requested fat target.");
  }

  const milkSolids = dairySolution.milk * ingredientSolidsRate(baseIngredients.milk);
  const creamSolids = dairySolution.cream * ingredientSolidsRate(baseIngredients.cream);
  const dairySugar = 
    dairySolution.milk * (baseIngredients.milk.sugar_pct / 100) +
    dairySolution.cream * (baseIngredients.cream.sugar_pct / 100);
  const dairyPac =
    dairySolution.milk * (baseIngredients.milk.pac_value / 100) +
    dairySolution.cream * (baseIngredients.cream.pac_value / 100);
  const dairyPodAbs =
    dairySolution.milk * (baseIngredients.milk.pod_value / 100) +
    dairySolution.cream * (baseIngredients.cream.pod_value / 100);
  const actualFatPct = ((fixedTotals.fat + remainingFatTarget) / targetTotalWeight) * 100;
  const actualSugarPct =
    ((fixedTotals.sugar + sugarBlend.sugar + dairySugar) / targetTotalWeight) * 100;
  const actualSolidsPct =
    ((fixedTotals.solids + stabilizerContribution.solids + sugarBlend.solids + milkSolids + creamSolids) /
      targetTotalWeight) *
    100;
  const actualPac =
    (fixedTotals.pac + sugarBlend.pac + dairyPac) / (targetTotalWeight / 1000);
  const actualPodPct =
    ((fixedTotals.podAbs + sugarBlend.podAbs + dairyPodAbs) / targetTotalWeight) * 100;

  if (
    actualSugarPct < adjustedProfile.sugarPct.min ||
    actualSugarPct > adjustedProfile.sugarPct.max
  ) {
    warnings.push({
      title: "Sugar Window Warning",
      message: `Total sugar is ${round2(actualSugarPct)}%, outside the ${adjustedProfile.sugarPct.min}-${adjustedProfile.sugarPct.max}% target window.`,
    });
  }

  if (actualSolidsPct > adjustedProfile.totalSolidsPct.max) {
    warnings.push({
      title: "Total Solids Warning",
      message: `Total solids exceed ${adjustedProfile.totalSolidsPct.max}%. Reduce NFDM or increase Water/Milk to soften the formula.`,
    });
  }

  if (baseIngredients.nfdm && actualSolidsPct < targetSolidsPercent - 1.2) {
    warnings.push({
      title: "Total Solids Running Low",
      message: "Consider adding NFDM or reducing water load to bring body back into the target solids window.",
    });
  }

  const densityKgPerL = round2(
    computeDensityKgPerL({
      fatPct: actualFatPct,
      solidsPct: actualSolidsPct,
    })
  );
  const estimatedVolumeLiters = round2(
    calculateOutputVolume({
      totalWeightKg: targetTotalWeight / 1000,
      baseDensityKgPerL: densityKgPerL,
      overrunPct,
    })
  );
  const ingredientRows = [
      {
        name: baseIngredients.milk.name,
        grams: round2(dairySolution.milk),
        percentage: round2((dairySolution.milk / targetTotalWeight) * 100),
        costPerKg: milkCostPerKg,
        totalCost: round2((dairySolution.milk / 1000) * milkCostPerKg),
      },
      {
        name: baseIngredients.cream.name,
        grams: round2(dairySolution.cream),
        percentage: round2((dairySolution.cream / targetTotalWeight) * 100),
        costPerKg: creamCostPerKg,
        totalCost: round2((dairySolution.cream / 1000) * creamCostPerKg),
      },
      ...sugarBlend.ingredients.map((item) => ({
        name: item.ingredient.name,
        grams: round2(item.grams),
        percentage: round2((item.grams / targetTotalWeight) * 100),
        costPerKg: resolveIngredientCost({
          ingredient: item.ingredient,
          priceLookup,
          costMode: economicsMode,
        }).effectiveCostPerKg,
        totalCost: round2(
          (item.grams / 1000) *
            resolveIngredientCost({
              ingredient: item.ingredient,
              priceLookup,
              costMode: economicsMode,
            }).effectiveCostPerKg
        ),
      })),
      ...fixedRows.map((item) => ({
        name: item.name,
        grams: round2(item.grams),
        percentage: round2((item.grams / targetTotalWeight) * 100),
        costPerKg: item.cost_per_kg,
        totalCost: round2((item.grams / 1000) * item.cost_per_kg),
      })),
      {
        name: `${stabilizer.brand_name} ${stabilizer.product_name}`,
        grams: round2(stabilizerWeight),
        percentage: round2((stabilizerWeight / targetTotalWeight) * 100),
        costPerKg: STABILIZER_COST_PER_KG,
        totalCost: round2(stabilizerContribution.cost),
      },
    ].sort((left, right) => right.grams - left.grams);
  const economics = calculateEconomics({
    ingredients: ingredientRows,
    estimatedVolumeLiters,
    densityKgPerL,
    priceLookup,
    pricing:
      pricing ?? {
        costMode: economicsMode,
        currency: "USD",
        targetMarginPct,
        retailPricePerLiter,
        scoopSizeGrams: 90,
        pintVolumeLiters: 0.473,
      },
  });

  return {
    ingredientRows: economics.ingredients,
    metrics: {
      fatPct: round2(actualFatPct),
      sugarPct: round2(actualSugarPct),
      pac: round2(actualPac),
      pacRange: {
        min: adjustedProfile.pac.min,
        max: adjustedProfile.pac.max,
      },
      podPct: round2(actualPodPct),
      solidsPct: round2(actualSolidsPct),
      totalBatchCost: economics.metrics.totalBatchCost,
      costPerKg: economics.metrics.costPerKg,
      costPerLiter: economics.metrics.costPerLiter,
      estimatedMarginPct: economics.metrics.estimatedMarginPct,
      suggestedRetailPerLiter: economics.metrics.suggestedRetailPerLiter,
      suggestedRetailPerPint: economics.metrics.suggestedRetailPerPint,
      suggestedRetailPerScoop: economics.metrics.suggestedRetailPerScoop,
      currency: economics.metrics.currency,
      densityKgPerL,
    } satisfies BalancedMetrics,
    estimatedVolumeLiters,
    warnings,
    fixedIngredientNotes: [
      `${resolvedFlavorRows
        .map((item) => `${round2(item.grams)}g ${item.name}`)
        .join(" + ")} contributes ${round2(flavorTotals.fat)}g fat and ${round2(
        flavorTotals.solids
      )}g total solids before dairy rebalance.`,
      `Residual dairy load solved with ${round2(dairySolution.cream)}g cream and ${round2(
        dairySolution.milk
      )}g milk using the exact two-equation milk/cream system.`,
      ...(sugarReduction
        ? [
            `Sugar reduction mode lowered the POD target by ${round2(
              (1 - SUGAR_REDUCTION_FACTOR) * 100
            )}% while keeping PAC near target.`,
          ]
        : []),
    ],
    logicPriority: getLogicPriorityCounts({
      milk: baseIngredients.milk,
      cream: baseIngredients.cream,
      sugars: sugarBlend.ingredients,
      flavorIngredients,
      customIngredients,
      nfdm: baseIngredients.nfdm ?? null,
    }),
  };
}

export function balanceGelato({
  targetBatchKg,
  flavorProfile,
  baseType,
  displayType,
  equipment = defaultEquipment[0],
  ingredientLibrary = defaultIngredients,
  stabilizerLibrary = defaultStabilizers,
  availableSugars = sugarOptions,
  intensity = 1,
  targetFatPct,
  targetPac,
  targetPodPct,
  targetSolidsPct,
  overrunPct = equipment.default_overrun_pct,
  retailPricePerLiter = 28,
  targetMarginPct = 75,
  priceLookup,
  economicsMode = "market_average",
  pricing,
  customIngredients = [],
  sugarReduction = false,
  pantryStock = {},
  recipeStyle = "Gelato",
}: BalanceGelatoOptions): BalancedRecipe {
  const flavor = resolveFlavorArchetype(
    lookupFlavorProfile(flavorProfile),
    ingredientLibrary
  );
  const targetMixWeight = targetBatchKg * 1000;
  const ingredientMap = buildIngredientMap(ingredientLibrary);
  const baseIngredients = getBaseIngredients(ingredientLibrary);
  const inStock = (name: string) => pantryStock[name] !== false;

  if (!inStock(baseIngredients["Whole Milk"].name) || !inStock(baseIngredients["Heavy Cream"].name)) {
    throw new Error("Whole Milk and Heavy Cream must remain in stock to rebalance the base.");
  }

  const requestedBaseType = baseType;
  const selectedBaseType = equipment.heating_capability || baseType === "Cold" ? baseType : "Cold";
  const hotStabilizer =
    stabilizerLibrary.find((item) => item.process_type === "Hot") ??
    defaultStabilizers.find((item) => item.process_type === "Hot")!;
  const coldStabilizer =
    stabilizerLibrary.find((item) => item.process_type === "Cold") ??
    defaultStabilizers.find((item) => item.process_type === "Cold")!;
  const selectedStabilizer = selectedBaseType === "Hot" ? hotStabilizer : coldStabilizer;
  const coldAlternative =
    requestedBaseType === "Hot" && !equipment.heating_capability
      ? getClosestColdProcessAlternative(hotStabilizer, stabilizerLibrary)
      : null;

  const flavorFixedLoad = computeFixedTotals(flavor, targetMixWeight, intensity, []);
  const flavorComponents = flavor.fixedIngredients.map((item) => ({
    name: item.name,
    grams: (item.grams_per_kg_mix * targetMixWeight * intensity) / 1000,
    fat_pct: item.fat_pct,
    sugar_pct: item.sugar_pct,
    solids_non_fat_pct: item.solids_non_fat_pct,
    other_solids_pct: item.other_solids_pct,
    pac_value: item.pac_value,
    pod_value: item.pod_value,
    cost_per_kg: item.cost_per_kg,
    data_priority: item.data_priority,
  }));
  const flavorPaste = {
    name: flavor.label,
    grams: flavorFixedLoad.rows.reduce((sum, item) => sum + item.grams, 0),
    fat_pct:
      flavorFixedLoad.rows.length === 0
        ? 0
        : (flavorFixedLoad.totals.fat / flavorFixedLoad.rows.reduce((sum, item) => sum + item.grams, 0)) * 100,
    sugar_pct:
      flavorFixedLoad.rows.length === 0
        ? 0
        : (flavorFixedLoad.totals.sugar / flavorFixedLoad.rows.reduce((sum, item) => sum + item.grams, 0)) * 100,
    solids_non_fat_pct: 0,
    other_solids_pct:
      flavorFixedLoad.rows.length === 0
        ? 0
        : Math.max(
            (flavorFixedLoad.totals.solids - flavorFixedLoad.totals.fat - flavorFixedLoad.totals.sugar) /
              flavorFixedLoad.rows.reduce((sum, item) => sum + item.grams, 0) *
              100,
            0
          ),
    pac_value:
      flavorFixedLoad.rows.length === 0
        ? 0
        : (flavorFixedLoad.totals.pac / flavorFixedLoad.rows.reduce((sum, item) => sum + item.grams, 0)) * 100,
    pod_value:
      flavorFixedLoad.rows.length === 0
        ? 0
        : (flavorFixedLoad.totals.podAbs / flavorFixedLoad.rows.reduce((sum, item) => sum + item.grams, 0)) * 100,
    cost_per_kg:
      flavorFixedLoad.rows.length === 0
        ? 0
        : (flavorFixedLoad.totals.cost / flavorFixedLoad.rows.reduce((sum, item) => sum + item.grams, 0)) * 1000,
    data_priority: "industry_average" as const,
  };

  const sugarLibrary = availableSugars
    .filter((name) => inStock(name))
    .map((name) =>
      ingredientMap.get(name) ??
      (name === "Maltodextrin" ? ingredientMap.get("Maltodextrin (DE19)") : undefined)
    )
    .filter((item): item is Ingredient => Boolean(item));

  if (!sugarLibrary.length) {
    throw new Error("Select at least one in-stock sugar to balance the formula.");
  }

  const result = rebalanceRecipe({
    baseIngredients: {
      milk: baseIngredients["Whole Milk"],
      cream: baseIngredients["Heavy Cream"],
      sugars: sugarLibrary,
      nfdm: inStock(baseIngredients.NFDM.name) ? baseIngredients.NFDM : null,
    },
    flavorPaste,
    flavorComponents,
    targetTotalWeight: targetMixWeight,
    displayType,
    targetProfile: recipeStyle,
    stabilizer: selectedStabilizer,
    selectedEquipment: equipment,
    customIngredients,
    targetFatPct: targetFatPct ?? flavor.targetFatPct,
    targetPac: targetPac ?? flavor.targetPac,
    targetPodPct: targetPodPct ?? flavor.targetPodPct,
    targetSolidsPct: targetSolidsPct ?? flavor.targetSolidsPct,
    overrunPct,
    retailPricePerLiter,
    targetMarginPct: pricing?.targetMarginPct ?? targetMarginPct,
    priceLookup,
    economicsMode: pricing?.costMode ?? economicsMode,
    pricing,
    sugarReduction,
    selectedBaseType,
    requestedBaseType,
    flavorIngredients: flavor.fixedIngredients,
  });

  const warnings = [...result.warnings];

  if (coldAlternative) {
    warnings.push({
      title: "Cold Process Alternative",
      message: `Closest cold-process alternative: ${coldAlternative.brand_name} ${coldAlternative.product_name}.`,
    });
  }

  return {
    title: flavor.label,
    baseType: selectedBaseType,
    flavorKey: flavor.key,
    totalMixWeight: round2(targetMixWeight),
    estimatedVolumeLiters: result.estimatedVolumeLiters,
    overrunPct: round2(overrunPct),
    stabilizer: selectedStabilizer,
    fixedIngredientNotes: [...flavor.archetypeNotes, ...result.fixedIngredientNotes],
    logicPriority: getLogicPriorityCounts({
      milk: baseIngredients["Whole Milk"],
      cream: baseIngredients["Heavy Cream"],
      sugars: result.ingredientRows
        .filter((row) => sugarLibrary.some((item) => item.name === row.name))
        .map((row) => ({
          ingredient: sugarLibrary.find((item) => item.name === row.name)!,
          grams: row.grams,
        })),
      flavorIngredients: flavor.fixedIngredients,
      customIngredients,
      nfdm: inStock(baseIngredients.NFDM.name) ? baseIngredients.NFDM : null,
    }),
    warnings,
    targetProfile: recipeStyle,
    ingredients: result.ingredientRows,
    metrics: result.metrics,
  };
}
