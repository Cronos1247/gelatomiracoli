import { mobileSupabase } from "./supabase";
import { getWebApiBaseUrl } from "./config";
import type { MobileIngredient, PantryLoadResult } from "../types";

const fallbackIngredients: MobileIngredient[] = [
  {
    name: "Whole Milk",
    category: "Dairy",
    is_flavor: false,
    fat_pct: 3.5,
    sugar_pct: 4.8,
    total_solids_pct: 12,
    pac_value: 1,
    pod_value: 0.16,
    is_master: true,
  },
  {
    name: "Heavy Cream (36%)",
    category: "Dairy",
    is_flavor: false,
    fat_pct: 36,
    sugar_pct: 3,
    total_solids_pct: 41,
    pac_value: 0.8,
    pod_value: 0.1,
    is_master: true,
  },
  {
    name: "Sucrose",
    category: "Sugar",
    is_flavor: false,
    fat_pct: 0,
    sugar_pct: 100,
    total_solids_pct: 100,
    pac_value: 1,
    pod_value: 1,
    is_master: true,
  },
  {
    name: "Dextrose",
    category: "Sugar",
    is_flavor: false,
    fat_pct: 0,
    sugar_pct: 95,
    total_solids_pct: 95,
    pac_value: 1.9,
    pod_value: 0.7,
    is_master: true,
  },
  {
    name: "Dark Chocolate 70%",
    category: "Flavor Paste",
    is_flavor: true,
    fat_pct: 42,
    sugar_pct: 29,
    total_solids_pct: 99,
    pac_value: 29,
    pod_value: 29,
    dosage_guideline_per_kg: 120,
    is_master: true,
  },
  {
    name: "Hazelnut Paste (Pure)",
    category: "Flavor Paste",
    is_flavor: true,
    fat_pct: 62,
    sugar_pct: 5,
    total_solids_pct: 99,
    pac_value: 5,
    pod_value: 5,
    dosage_guideline_per_kg: 100,
    is_master: true,
  },
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function inferWaterPct(record: Record<string, unknown>) {
  if (typeof record.water_pct === "number") {
    return record.water_pct;
  }

  if (typeof record.water_percent === "number") {
    return record.water_percent;
  }

  const totalSolids =
    typeof record.total_solids_pct === "number"
      ? record.total_solids_pct
      : Number(record.total_solids_pct ?? NaN);

  if (!Number.isNaN(totalSolids)) {
    return Math.max(0, Math.min(100, 100 - totalSolids));
  }

  return 0;
}

function inferIngredientCategory(record: Record<string, unknown>) {
  const explicitCategory = typeof record.category === "string" ? record.category : null;

  if (explicitCategory && explicitCategory.toLowerCase() !== "other") {
    return explicitCategory;
  }

  const name = normalizeText(typeof record.name === "string" ? record.name : null);
  const brand = normalizeText(typeof record.brand_name === "string" ? record.brand_name : null);
  const productCode = normalizeText(
    typeof record.product_code === "string" ? record.product_code : null
  );
  const haystack = [name, brand, productCode].filter(Boolean).join(" ");
  const isBaseIngredient = record.is_base_ingredient === true;

  if (isBaseIngredient || /base|stabilizer|stabiliser|neutro|superneutro|totalbase|capri 50|yofit/i.test(haystack)) {
    return "Base/Stabilizer";
  }

  if (/fruttosa|fructose|dextrose|sucrose|sugar|glucose|maltodextrin|erythritol|eritritol|polydextrose|diamant/i.test(haystack)) {
    return "Sugar";
  }

  if (/milk|cream|latte|panna|whey|dairy/i.test(haystack)) {
    return "Dairy";
  }

  if (/flavor|paste|pistach|hazelnut|nocciola|chocolate|cocoa|ciocc|giandui|vanilla|mint|fragola|strawberry|caramel/i.test(haystack)) {
    return "Flavor Paste";
  }

  return explicitCategory;
}

export function inferIngredientFlavor(record: Record<string, unknown>) {
  if (typeof record.is_flavor === "boolean") {
    return record.is_flavor;
  }

  const name = normalizeText(typeof record.name === "string" ? record.name : null);
  const category = normalizeText(inferIngredientCategory(record));
  const brand = normalizeText(typeof record.brand_name === "string" ? record.brand_name : null);
  const productCode = normalizeText(
    typeof record.product_code === "string" ? record.product_code : null
  );
  const haystack = [name, category, brand, productCode].filter(Boolean).join(" ");
  const dosage = Number(record.dosage_guideline_per_kg ?? record.dosage_guideline ?? 0);
  const isColdProcess = record.is_cold_process === true;
  const isBaseIngredient = record.is_base_ingredient === true;

  if (isBaseIngredient || /base|stabilizer|neutro|superneutro|totalbase/.test(haystack)) {
    return false;
  }

  if (/flavor|paste/.test(category)) {
    return true;
  }

  if (
    /(pistach|hazelnut|nocciola|chocolate|cocoa|ciocc|coconut|giandui|lampone|raspberry|zabaione|peanut|almond|pecan|tiramisu|yoggi|white chocolate|vanilla|mint|strawberry|fragola|mango|lemon|caramel|biscott)/.test(
      haystack
    )
  ) {
    return true;
  }

  return isColdProcess && dosage >= 50 && category === "other";
}

export function normalizeIngredient(record: Record<string, unknown>): MobileIngredient {
  const category = inferIngredientCategory(record);
  const isBaseIngredient =
    typeof record.is_base_ingredient === "boolean"
      ? record.is_base_ingredient
      : normalizeText(category) === "base/stabilizer";

  return {
    id: typeof record.id === "string" ? record.id : undefined,
    name: typeof record.name === "string" ? record.name : "Unnamed Ingredient",
    name_en: typeof record.name_en === "string" ? record.name_en : null,
    name_es: typeof record.name_es === "string" ? record.name_es : null,
    name_it: typeof record.name_it === "string" ? record.name_it : null,
    category,
    is_flavor: inferIngredientFlavor(record),
    is_cold_process: typeof record.is_cold_process === "boolean" ? record.is_cold_process : null,
    is_base_ingredient: isBaseIngredient,
    brand_name: typeof record.brand_name === "string" ? record.brand_name : null,
    product_code: typeof record.product_code === "string" ? record.product_code : null,
    fat_pct: typeof record.fat_pct === "number" ? record.fat_pct : Number(record.fat_pct ?? 0),
    sugar_pct:
      typeof record.sugar_pct === "number" ? record.sugar_pct : Number(record.sugar_pct ?? 0),
    total_solids_pct:
      typeof record.total_solids_pct === "number"
        ? record.total_solids_pct
        : Number(record.total_solids_pct ?? 0),
    water_pct: inferWaterPct(record),
    pac_value: typeof record.pac_value === "number" ? record.pac_value : Number(record.pac_value ?? 0),
    pod_value: typeof record.pod_value === "number" ? record.pod_value : Number(record.pod_value ?? 0),
    is_master: Boolean(record.is_master),
    is_global: record.is_global === true,
    is_verified: record.is_verified === true,
    dosage_guideline_per_kg:
      typeof record.dosage_guideline_per_kg === "number"
        ? record.dosage_guideline_per_kg
        : Number(record.dosage_guideline_per_kg ?? 0),
    dosage_guideline:
      typeof record.dosage_guideline === "number"
        ? record.dosage_guideline
        : Number(record.dosage_guideline ?? 0),
    cost_per_container:
      typeof record.cost_per_container === "number"
        ? record.cost_per_container
        : Number(record.cost_per_container ?? 0),
    container_size_g:
      typeof record.container_size_g === "number"
        ? record.container_size_g
        : Number(record.container_size_g ?? 1000),
    status: typeof record.status === "string" ? record.status : null,
    average_market_cost:
      typeof record.average_market_cost === "number"
        ? record.average_market_cost
        : Number(record.average_market_cost ?? 0),
  };
}

export async function loadPantry(): Promise<PantryLoadResult> {
  if (!mobileSupabase) {
    return { source: "fallback", ingredients: fallbackIngredients };
  }

  const combined = await mobileSupabase.from("combined_pantry").select("*").order("name", {
    ascending: true,
  });

  if (!combined.error && combined.data) {
    return {
      source: "combined_pantry",
      ingredients: combined.data.map((item) => normalizeIngredient(item as Record<string, unknown>)),
    };
  }

  const {
    data: { user },
  } = await mobileSupabase.auth.getUser();

  const isGlobalProbe = await mobileSupabase.from("ingredients").select("id, is_global").limit(1);
  const supportsIsGlobal = !isGlobalProbe.error;

  let ingredientsQuery = mobileSupabase.from("ingredients").select("*").order("name", {
    ascending: true,
  });

  ingredientsQuery = supportsIsGlobal
    ? user
      ? ingredientsQuery.or(`user_id.eq.${user.id},is_global.eq.true`)
      : ingredientsQuery.eq("is_global", true)
    : user
      ? ingredientsQuery.or(`user_id.eq.${user.id},is_master.eq.true,user_id.is.null`)
      : ingredientsQuery.or("is_master.eq.true,user_id.is.null");

  const ingredients = await ingredientsQuery;

  if (!ingredients.error && ingredients.data) {
    return {
      source: "ingredients",
      ingredients: ingredients.data.map((item) =>
        normalizeIngredient(item as Record<string, unknown>)
      ),
    };
  }

  return { source: "fallback", ingredients: fallbackIngredients };
}

export async function savePantryIngredient(ingredient: MobileIngredient) {
  const baseUrl = getWebApiBaseUrl();

  if (!baseUrl) {
    throw new Error("Web API base URL is required for mobile pantry sync.");
  }

  const response = await fetch(`${baseUrl}/api/mobile/pantry`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ingredient),
  });

  const payload = (await response.json()) as {
    error?: string;
    ingredient?: Record<string, unknown>;
  };

  if (!response.ok || !payload.ingredient) {
    throw new Error(payload.error ?? "Failed to save ingredient to pantry.");
  }

  return normalizeIngredient(payload.ingredient);
}
