import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PortalRecipeLab,
  type PortalDisplayCase,
  type PortalEquipmentUnit,
  type PortalLabIngredient,
} from "@/components/portal/lab/PortalRecipeLab";
import { defaultIngredients } from "@/lib/default-data";

function normalizeNumber(value: unknown, fallback = 0) {
  const next = typeof value === "number" ? value : Number(value ?? fallback);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeLabIngredient(record: Record<string, unknown>): PortalLabIngredient {
  return {
    id: typeof record.id === "string" ? record.id : undefined,
    name: String(record.name ?? "Ingredient"),
    category: typeof record.category === "string" ? record.category : "Other",
    is_flavor: record.is_flavor === true,
    is_base_ingredient: record.is_base_ingredient === true,
    fat_pct: normalizeNumber(record.fat_pct),
    sugar_pct: normalizeNumber(record.sugar_pct),
    total_solids_pct: normalizeNumber(record.total_solids_pct),
    water_pct: normalizeNumber(record.water_pct),
    pac_value: normalizeNumber(record.pac_value),
    pod_value: normalizeNumber(record.pod_value),
    dosage_guideline_per_kg: normalizeNumber(record.dosage_guideline_per_kg),
    dosage_guideline: normalizeNumber(record.dosage_guideline),
    cost_per_container: normalizeNumber(record.cost_per_container),
    container_size_g: normalizeNumber(record.container_size_g, 1000),
    average_market_cost: normalizeNumber(record.average_market_cost),
    is_master: record.is_master === true,
    status: typeof record.status === "string" ? record.status : null,
  };
}

function normalizeEquipment(record: Record<string, unknown>): PortalEquipmentUnit {
  return {
    id: String(record.id ?? `equipment-${Math.random().toString(36).slice(2, 8)}`),
    brand: typeof record.brand === "string" ? record.brand : "Bravo",
    model: typeof record.model === "string" ? record.model : "Trittico 5L",
    min_batch_l: normalizeNumber(record.min_batch_l, 1),
    max_batch_l: normalizeNumber(record.max_batch_l ?? record.max_batch_kg, 5),
    default_overrun_pct: normalizeNumber(record.default_overrun_pct, 35),
  };
}

function normalizeDisplayCase(record: Record<string, unknown>, index: number): PortalDisplayCase {
  return {
    id: String(record.id ?? `display-case-${index}`),
    name: typeof record.name === "string" ? record.name : `Display Case ${index + 1}`,
    capacity_pans: normalizeNumber(record.capacity_pans, 12),
    target_temp_c: normalizeNumber(record.target_temp_c, -15),
    pac_range_min: normalizeNumber(record.pac_range_min, 240),
    pac_range_max: normalizeNumber(record.pac_range_max, 320),
    display_order: normalizeNumber(record.display_order, index),
    style: record.style === "Pozzetti" ? "Pozzetti" : "Traditional",
  };
}

function getFallbackIngredients(): PortalLabIngredient[] {
  return defaultIngredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    is_flavor: /pistachio|hazelnut|chocolate|strawberry/i.test(ingredient.name),
    is_base_ingredient: ingredient.is_base_ingredient,
    fat_pct: ingredient.fat_pct,
    sugar_pct: ingredient.sugar_pct,
    total_solids_pct: Number(ingredient.total_solids_pct ?? 0),
    water_pct: Number(100 - Number(ingredient.total_solids_pct ?? 0)),
    pac_value: ingredient.pac_value / 100,
    pod_value: ingredient.pod_value / 100,
    dosage_guideline_per_kg: ingredient.dosage_guideline ?? 0,
    dosage_guideline: ingredient.dosage_guideline ?? 0,
    cost_per_container: ingredient.average_market_cost ?? ingredient.cost_per_kg ?? 0,
    container_size_g: 1000,
    average_market_cost: ingredient.average_market_cost ?? ingredient.cost_per_kg ?? 0,
    is_master: ingredient.is_master,
    status: "fallback",
  }));
}

const FALLBACK_EQUIPMENT: PortalEquipmentUnit[] = [
  {
    id: "fallback-bravo-trittico",
    brand: "Bravo",
    model: "Trittico 5L",
    min_batch_l: 1,
    max_batch_l: 5,
    default_overrun_pct: 35,
  },
];

const FALLBACK_CASES: PortalDisplayCase[] = [
  {
    id: "fallback-front-window",
    name: "Front Window Case",
    capacity_pans: 24,
    target_temp_c: -15,
    pac_range_min: 280,
    pac_range_max: 999,
    display_order: 0,
    style: "Traditional",
  },
];

export const dynamic = "force-dynamic";

export default async function PortalLabPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <PortalRecipeLab
        ingredients={getFallbackIngredients()}
        equipmentUnits={FALLBACK_EQUIPMENT}
        displayCases={FALLBACK_CASES}
      />
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let supportsIsGlobal = true;
  const globalProbe = await supabase.from("ingredients").select("id, is_global").limit(1);

  if (globalProbe.error) {
    supportsIsGlobal = false;
  }

  let ingredientQuery = supabase
    .from("ingredients")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (supportsIsGlobal) {
    ingredientQuery = user
      ? ingredientQuery.or(`user_id.eq.${user.id},is_global.eq.true`)
      : ingredientQuery.eq("is_global", true);
  } else {
    ingredientQuery = user
      ? ingredientQuery.or(`user_id.eq.${user.id},is_master.eq.true,user_id.is.null`)
      : ingredientQuery.or("is_master.eq.true,user_id.is.null");
  }

  const [ingredientResult, equipmentResult, displayCaseResult] = await Promise.all([
    ingredientQuery,
    supabase.from("equipment").select("*").order("brand", { ascending: true }),
    supabase.from("display_cases").select("*").order("display_order", { ascending: true }),
  ]);

  const ingredients =
    !ingredientResult.error && ingredientResult.data && ingredientResult.data.length > 0
      ? (ingredientResult.data as Record<string, unknown>[]).map(normalizeLabIngredient)
      : getFallbackIngredients();

  const equipmentUnits =
    !equipmentResult.error && equipmentResult.data && equipmentResult.data.length > 0
      ? (equipmentResult.data as Record<string, unknown>[]).map(normalizeEquipment)
      : FALLBACK_EQUIPMENT;

  const displayCases =
    !displayCaseResult.error && displayCaseResult.data && displayCaseResult.data.length > 0
      ? (displayCaseResult.data as Record<string, unknown>[]).map(normalizeDisplayCase)
      : FALLBACK_CASES;

  return (
    <PortalRecipeLab
      ingredients={ingredients}
      equipmentUnits={equipmentUnits}
      displayCases={displayCases}
    />
  );
}
