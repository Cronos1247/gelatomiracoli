import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type MasterIngredientPayload = {
  name: string;
  brand_name: string | null;
  product_code: string | null;
  upc: string | null;
  revision_date: string | null;
  category: string;
  fat_pct: number;
  sugar_pct: number;
  total_solids_pct: number;
  msnf_pct: number;
  solids_non_fat_pct: number;
  other_solids_pct: number;
  pac_value: number;
  pod_value: number;
  cost_per_kg: number;
  average_market_cost: number;
  cost_per_container?: number;
  container_size_g?: number;
  is_cold_process: boolean;
  is_base_ingredient: boolean;
  is_dairy?: boolean | null;
  dosage_guideline: number | null;
  dosage_guideline_per_kg?: number | null;
  pdf_url: string | null;
  raw_ocr_dump: string;
  extraction_source: "Balancing Parameters" | "Nutritional Fallback";
  status?: "draft" | "verified" | "needs_review";
};

type IngredientRow = MasterIngredientPayload & {
  id: string;
  created_at?: string | null;
  is_master?: boolean;
  user_id?: string | null;
};

export function createServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function toFriendlySupabaseError(error: unknown) {
  const message = extractSupabaseErrorMessage(error);

  if (
    message.includes("Could not find the table 'public.ingredients' in the schema cache") ||
    message.includes('PGRST205')
  ) {
    return "The connected Supabase project does not have the Miracoli pantry schema yet. Run the Sonny's Command Center Supabase migrations so public.ingredients exists, then try commit again.";
  }

  return message;
}

function extractSupabaseErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    return (
      [
        "message" in error && typeof error.message === "string" ? error.message : null,
        "details" in error && typeof error.details === "string" ? error.details : null,
        "hint" in error && typeof error.hint === "string" ? error.hint : null,
        "code" in error && typeof error.code === "string" ? `code ${error.code}` : null,
      ]
        .filter(Boolean)
        .join(" | ") || JSON.stringify(error)
    );
  }

  return String(error ?? "Unknown error");
}

function shouldRetryWithoutIsDairy(error: unknown) {
  const message = extractSupabaseErrorMessage(error);
  return /column ["']?is_dairy["']?.+does not exist|Could not find the 'is_dairy' column/i.test(
    message
  );
}

async function loadExistingMasterIngredient(
  supabase: SupabaseClient,
  payload: MasterIngredientPayload
) {
  const normalizedProductCode = payload.product_code?.trim() || null;

  if (normalizedProductCode) {
    const existingByProductCode = await supabase
      .from("ingredients")
      .select("*")
      .eq("product_code", normalizedProductCode)
      .order("revision_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<IngredientRow>();

    if (existingByProductCode.data) {
      return existingByProductCode.data;
    }
  }

  const existingByName = await supabase
    .from("ingredients")
    .select("*")
    .eq("is_master", true)
    .eq("name", payload.name)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<IngredientRow>();

  return existingByName.data ?? null;
}

function shouldKeepExistingRecord(
  existing: IngredientRow,
  incomingRevisionDate: string | null
) {
  if (!incomingRevisionDate) {
    return true;
  }

  if (!existing.revision_date) {
    return false;
  }

  return incomingRevisionDate <= existing.revision_date;
}

export async function publishMasterIngredientDirect(
  supabase: SupabaseClient,
  payload: MasterIngredientPayload
) {
  const normalizedPayload = {
    ...payload,
    dosage_guideline_per_kg:
      payload.dosage_guideline_per_kg ?? payload.dosage_guideline ?? null,
  };
  const existing = await loadExistingMasterIngredient(supabase, payload);

  if (existing) {
    if (shouldKeepExistingRecord(existing, payload.revision_date)) {
      return existing;
    }

    let update = await supabase
      .from("ingredients")
      .update({
        ...normalizedPayload,
        is_master: true,
        status: payload.status ?? "verified",
        user_id: null,
      })
      .eq("id", existing.id)
      .select("*")
      .single<IngredientRow>();

    if (update.error && shouldRetryWithoutIsDairy(update.error)) {
      const { is_dairy: _ignoredIsDairy, ...legacyPayload } = normalizedPayload;
      update = await supabase
        .from("ingredients")
        .update({
          ...legacyPayload,
          is_master: true,
          status: payload.status ?? "verified",
          user_id: null,
        })
        .eq("id", existing.id)
        .select("*")
        .single<IngredientRow>();
    }

    if (update.error) {
      throw new Error(toFriendlySupabaseError(update.error));
    }

    return update.data;
  }

  let insert = await supabase
    .from("ingredients")
    .insert({
      ...normalizedPayload,
      is_master: true,
      status: payload.status ?? "verified",
      user_id: null,
    })
    .select("*")
    .single<IngredientRow>();

  if (insert.error && shouldRetryWithoutIsDairy(insert.error)) {
    const { is_dairy: _ignoredIsDairy, ...legacyPayload } = normalizedPayload;
    insert = await supabase
      .from("ingredients")
      .insert({
        ...legacyPayload,
        is_master: true,
        status: payload.status ?? "verified",
        user_id: null,
      })
      .select("*")
      .single<IngredientRow>();
  }

  if (insert.error) {
    throw new Error(toFriendlySupabaseError(insert.error));
  }

  return insert.data;
}
