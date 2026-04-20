import { createClient } from "@supabase/supabase-js";
import {
  defaultEquipment,
  defaultIngredients,
  defaultSettings,
  defaultStabilizers,
  type AppSettingRecord,
  type Equipment,
  type Ingredient,
  type Stabilizer,
} from "@/lib/default-data";

export type CatalogSource = "supabase" | "fallback";

type CatalogResult<T> = {
  items: T[];
  source: CatalogSource;
};

type SettingsResult = {
  item: AppSettingRecord;
  source: CatalogSource;
};

let supabaseClient: ReturnType<typeof createClient> | null | undefined;

function getReadonlyClient() {
  if (supabaseClient !== undefined) {
    return supabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    supabaseClient = null;
    return supabaseClient;
  }

  supabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}

function normalizeIngredients(
  items:
    | Array<
        Partial<Ingredient> & {
          msnf_pct?: number | null;
          dosage_guideline_per_kg?: number | null;
        }
      >
    | null
    | undefined
) {
  if (!items?.length) {
    return defaultIngredients;
  }

  const merged = new Map(defaultIngredients.map((ingredient) => [ingredient.name, ingredient]));

  for (const item of items) {
    if (!item.name) {
      continue;
    }

    const pacValue = Number(item.pac_value ?? 0);
    const podValue = Number(item.pod_value ?? 0);

    merged.set(item.name, {
      id: item.id ?? item.name.toLowerCase().replace(/\s+/g, "-"),
      name: item.name,
      name_en: item.name_en ? String(item.name_en) : null,
      name_es: item.name_es ? String(item.name_es) : null,
      name_it: item.name_it ? String(item.name_it) : null,
      brand_name: item.brand_name ? String(item.brand_name) : null,
      product_code: item.product_code ? String(item.product_code) : null,
      upc: item.upc ? String(item.upc) : null,
      revision_date: item.revision_date ? String(item.revision_date) : null,
      category: (item.category as Ingredient["category"]) ?? "Base",
      fat_pct: Number(item.fat_pct ?? 0),
      sugar_pct: Number(item.sugar_pct ?? 0),
      total_solids_pct: Number(
        item.total_solids_pct ??
          Number(item.fat_pct ?? 0) +
            Number(item.sugar_pct ?? 0) +
            Number(item.solids_non_fat_pct ?? item.msnf_pct ?? 0) +
            Number(item.other_solids_pct ?? 0)
      ),
      msnf_pct: Number(item.msnf_pct ?? item.solids_non_fat_pct ?? 0),
      solids_non_fat_pct: Number(item.solids_non_fat_pct ?? item.msnf_pct ?? 0),
      other_solids_pct: Number(item.other_solids_pct ?? 0),
      pac_value: pacValue > 0 && pacValue <= 10 ? pacValue * 100 : pacValue,
      pod_value: podValue > 0 && podValue <= 10 ? podValue * 100 : podValue,
      cost_per_kg: Number(item.cost_per_kg ?? 0),
      average_market_cost: Number(item.average_market_cost ?? item.cost_per_kg ?? 0),
      is_cold_process: Boolean(item.is_cold_process),
      is_base_ingredient: Boolean(item.is_base_ingredient ?? false),
      is_master: Boolean(item.is_master ?? true),
      dosage_guideline:
        item.dosage_guideline === null || item.dosage_guideline === undefined
          ? item.dosage_guideline_per_kg === null || item.dosage_guideline_per_kg === undefined
            ? null
            : Number(item.dosage_guideline_per_kg)
          : Number(item.dosage_guideline),
      pdf_url: item.pdf_url ? String(item.pdf_url) : null,
      raw_ocr_dump: item.raw_ocr_dump ? String(item.raw_ocr_dump) : null,
      extraction_source:
        item.extraction_source === "Nutritional Fallback"
          ? "Nutritional Fallback"
          : "Balancing Parameters",
      user_id: item.user_id ?? null,
      data_priority: "verified_lab_data",
    });
  }

  return Array.from(merged.values());
}

export async function getIngredientCatalog(): Promise<CatalogResult<Ingredient>> {
  const client = getReadonlyClient();

  if (!client) {
    return { items: defaultIngredients, source: "fallback" };
  }

  const combined = await client.from("combined_pantry").select("*").order("name");
  const { data, error } = combined.error
    ? await client.from("ingredients").select("*").order("name")
    : combined;

  if (error) {
    return { items: defaultIngredients, source: "fallback" };
  }

  return { items: normalizeIngredients(data as Partial<Ingredient>[]), source: "supabase" };
}

export async function getStabilizerCatalog(): Promise<CatalogResult<Stabilizer>> {
  const client = getReadonlyClient();

  if (!client) {
    return { items: defaultStabilizers, source: "fallback" };
  }

  const { data, error } = await client.from("stabilizers").select("*").order("brand_name");

  if (error || !data?.length) {
    return { items: defaultStabilizers, source: "fallback" };
  }

  return {
    items: (data as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id),
      brand_name: String(item.brand_name),
      product_name: String(item.product_name),
      dosage_range_min: Number(item.dosage_range_min),
      dosage_range_max: Number(item.dosage_range_max),
      process_type: item.process_type as Stabilizer["process_type"],
    })),
    source: "supabase",
  };
}

export async function getEquipmentCatalog(): Promise<CatalogResult<Equipment>> {
  const client = getReadonlyClient();

  if (!client) {
    return { items: defaultEquipment, source: "fallback" };
  }

  const modelLookup = await client.from("equipment_models").select("*").order("brand");

  if (!modelLookup.error && modelLookup.data?.length) {
    return {
      items: (modelLookup.data as Array<Record<string, unknown>>).map((item) => ({
        id: String(item.id),
        brand: String(item.brand),
        model: String(item.model),
        machine_type: String(item.machine_type ?? item.type ?? "Batch Freezer"),
        heating_capability: Boolean(item.heating_capability ?? item.heating),
        max_batch_kg: Number(item.max_batch_kg ?? 5),
        default_overrun_pct: Number(item.default_overrun_pct),
      })),
      source: "supabase",
    };
  }

  const { data, error } = await client.from("equipment").select("*").order("brand");

  if (error || !data?.length) {
    return { items: defaultEquipment, source: "fallback" };
  }

  return {
    items: (data as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id),
      brand: String(item.brand),
      model: String(item.model),
      machine_type: String(item.machine_type ?? item.type ?? "Batch Freezer"),
      heating_capability: Boolean(item.heating_capability),
      max_batch_kg: Number(item.max_batch_kg),
      default_overrun_pct: Number(item.default_overrun_pct),
    })),
    source: "supabase",
  };
}

export async function getDefaultSettings(): Promise<SettingsResult> {
  const client = getReadonlyClient();

  if (!client) {
    return { item: defaultSettings, source: "fallback" };
  }

  const { data, error } = await client
    .from("settings")
    .select("*")
    .is("user_id", null)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { item: defaultSettings, source: "fallback" };
  }

  const record = data as Record<string, unknown>;

  return {
    item: {
      id: String(record.id),
      user_id: record.user_id ? String(record.user_id) : null,
      display_type: record.display_type as AppSettingRecord["display_type"],
      equipment_id: record.equipment_id ? String(record.equipment_id) : null,
      lab_name: record.lab_name ? String(record.lab_name) : null,
      logo_url: record.logo_url ? String(record.logo_url) : null,
      language: record.language ? String(record.language) : defaultSettings.language,
      available_sugars: Array.isArray(record.available_sugars)
        ? (record.available_sugars as AppSettingRecord["available_sugars"])
        : defaultSettings.available_sugars,
    },
    source: "supabase",
  };
}
