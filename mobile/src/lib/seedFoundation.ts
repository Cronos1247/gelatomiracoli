import { FOUNDATION_INGREDIENTS } from "./foundationData";
import { mobileSupabase } from "./supabase";

function toIngredientInsertRecord(ingredient: (typeof FOUNDATION_INGREDIENTS)[number]) {
  return {
    name: ingredient.name,
    category: ingredient.category,
    pac_value: ingredient.pac,
    pod_value: ingredient.pod,
    total_solids_pct: ingredient.solids_percent,
    fat_pct: ingredient.fat_percent,
    water_pct: ingredient.water_percent,
    is_dairy: ingredient.is_dairy,
    sugar_pct: ingredient.pod,
    is_master: false,
    is_cold_process: true,
    status: "verified",
    average_market_cost: 0,
  };
}

function shouldRetryWithoutIsDairy(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message =
    [
      "message" in error && typeof error.message === "string" ? error.message : null,
      "details" in error && typeof error.details === "string" ? error.details : null,
      "hint" in error && typeof error.hint === "string" ? error.hint : null,
      "code" in error && typeof error.code === "string" ? error.code : null,
    ]
      .filter(Boolean)
      .join(" | ") || String(error);

  return /column ["']?is_dairy["']?.+does not exist|Could not find the 'is_dairy' column/i.test(
    message
  );
}

export async function seedFoundationPantry() {
  if (!mobileSupabase) {
    console.log("Foundation Seeder - ERROR:", "Supabase client is not configured.");
    throw new Error("Supabase client is not configured.");
  }

  const existing = await mobileSupabase.from("ingredients").select("id").limit(1);

  if (existing.error) {
    console.log("Foundation Seeder - CHECK ERROR:", existing.error);
    throw new Error(existing.error.message ?? "Failed to check existing ingredients.");
  }

  if ((existing.data?.length ?? 0) > 0) {
    console.log("Database already seeded");
    return { inserted: 0, skipped: FOUNDATION_INGREDIENTS.length };
  }

  let insert = await mobileSupabase
    .from("ingredients")
    .insert(FOUNDATION_INGREDIENTS.map((ingredient) => toIngredientInsertRecord(ingredient)));

  if (insert.error && shouldRetryWithoutIsDairy(insert.error)) {
    insert = await mobileSupabase.from("ingredients").insert(
      FOUNDATION_INGREDIENTS.map((ingredient) => {
        const { is_dairy: _ignoredIsDairy, ...legacyRecord } = toIngredientInsertRecord(ingredient);
        return legacyRecord;
      })
    );
  }

  if (insert.error) {
    console.log("Foundation Seeder - INSERT ERROR:", insert.error);
    throw new Error(insert.error.message ?? "Failed to seed foundation ingredients.");
  }

  console.log("Foundation Seeder - SUCCESS:", FOUNDATION_INGREDIENTS.length);
  return { inserted: FOUNDATION_INGREDIENTS.length, skipped: 0 };
}
