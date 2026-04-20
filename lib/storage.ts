import type { BalancedRecipe } from "@/lib/balance-gelato";
import type { Ingredient } from "@/lib/default-data";

export const STORAGE_KEYS = {
  recipeBook: "gelato-miracoli-recipe-book",
  pantry: "gelato-miracoli-pantry",
  studio: "gelato-miracoli-studio",
  profile: "gelato-miracoli-profile",
  pricing: "gelato-miracoli-pricing",
} as const;

export const SESSION_KEYS = {
  masterAdmin: "gelato-miracoli-master-admin-session",
  workbenchDraft: "gelato-miracoli-workbench-draft",
} as const;

export type RecipeBookEntry = BalancedRecipe & {
  id: string;
  recipeName: string;
  createdAt: string;
  equipmentId?: string | null;
  isSorbet?: boolean;
  logicSnapshot?: {
    flavorIntensityPct: number;
    targetFatPct: number;
    targetPac: number;
    targetPodPct: number;
    targetSolidsPct?: number;
    displayType: string;
    recipeStyle?: string;
    archetypeKey?: string;
    sugarReduction: boolean;
    overrunPct: number;
    targetMarginPct?: number;
    retailPricePerLiter?: number;
    pricingMode?: CostMode;
  };
  syncedAt?: string | null;
};

export type PantryStock = Record<string, boolean>;

export type StudioSnapshot = {
  labName: string;
  logoUrl: string | null;
};

export type ProfileSettings = {
  isMasterAdmin: boolean;
  is_master_admin?: boolean;
};

export type CostMode = "market_average" | "custom";

export type PricingSettings = {
  costMode: CostMode;
  currency: "USD" | "EUR";
  targetMarginPct: number;
  retailPricePerLiter: number;
  scoopSizeGrams: number;
  pintVolumeLiters: number;
};

export const defaultPricingSettings: PricingSettings = {
  costMode: "market_average",
  currency: "USD",
  targetMarginPct: 75,
  retailPricePerLiter: 28,
  scoopSizeGrams: 90,
  pintVolumeLiters: 0.473,
};

export function createPantryStock(ingredients: Ingredient[]) {
  return ingredients.reduce<PantryStock>((stock, ingredient) => {
    stock[ingredient.name] = true;
    return stock;
  }, {});
}

export function readStoredJson<T>(key: string, fallback: T) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = window.localStorage.getItem(key);

  if (!stored) {
    return fallback;
  }

  try {
    return JSON.parse(stored) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

export function writeStoredJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function normalizeProfileSettings(
  value: Partial<ProfileSettings> | null | undefined,
  fallback = false
): ProfileSettings {
  const isMasterAdmin = Boolean(value?.isMasterAdmin ?? value?.is_master_admin ?? fallback);

  return {
    isMasterAdmin,
    is_master_admin: isMasterAdmin,
  };
}

export function readProfileSettings(fallback = false) {
  if (typeof window === "undefined") {
    return normalizeProfileSettings(null, fallback);
  }

  const sessionAdmin = window.sessionStorage.getItem(SESSION_KEYS.masterAdmin) === "true";
  const stored = readStoredJson<Partial<ProfileSettings>>(STORAGE_KEYS.profile, {});

  return normalizeProfileSettings(stored, fallback || sessionAdmin);
}

export function writeProfileSettings(value: Partial<ProfileSettings>) {
  writeStoredJson(STORAGE_KEYS.profile, normalizeProfileSettings(value));
}

export function grantMasterAdminSession() {
  if (typeof window === "undefined") {
    return normalizeProfileSettings(null, true);
  }

  window.sessionStorage.setItem(SESSION_KEYS.masterAdmin, "true");
  const nextProfile = normalizeProfileSettings(readProfileSettings(true), true);
  writeProfileSettings(nextProfile);
  return nextProfile;
}
