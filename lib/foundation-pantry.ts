import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SeedableIngredientRecord = {
  name: string;
  category: string;
  pac: number;
  pod: number;
  solids_percent: number;
  fat_percent: number;
  water_percent: number;
  is_dairy: boolean;
  dosage_guideline_per_kg?: number | null;
  is_base_ingredient?: boolean;
};

export type FoundationSeedResult = {
  inserted: number;
  skipped: number;
  attempted: number;
};

export const FOUNDATION_INGREDIENTS: SeedableIngredientRecord[] = [
  {
    name: "Sucrose (Standard Sugar)",
    category: "Sugar",
    pac: 100,
    pod: 100,
    solids_percent: 100,
    fat_percent: 0,
    water_percent: 0,
    is_dairy: false,
    dosage_guideline_per_kg: 100,
  },
  {
    name: "Dextrose",
    category: "Sugar",
    pac: 190,
    pod: 70,
    solids_percent: 100,
    fat_percent: 0,
    water_percent: 0,
    is_dairy: false,
    dosage_guideline_per_kg: 100,
  },
  {
    name: "Maltodextrin (DE 19)",
    category: "Sugar",
    pac: 20,
    pod: 10,
    solids_percent: 100,
    fat_percent: 0,
    water_percent: 0,
    is_dairy: false,
    dosage_guideline_per_kg: 100,
  },
  {
    name: "Skim Milk Powder (SMP)",
    category: "Structure",
    pac: 0,
    pod: 0,
    solids_percent: 97,
    fat_percent: 1,
    water_percent: 3,
    is_dairy: true,
    dosage_guideline_per_kg: 35,
  },
  {
    name: "Raw Stabilizer (LBG/Guar Blend)",
    category: "Structure",
    pac: 0,
    pod: 0,
    solids_percent: 100,
    fat_percent: 0,
    water_percent: 0,
    is_dairy: false,
    dosage_guideline_per_kg: 4,
    is_base_ingredient: true,
  },
  {
    name: "Water",
    category: "Liquid",
    pac: 0,
    pod: 0,
    solids_percent: 0,
    fat_percent: 0,
    water_percent: 100,
    is_dairy: false,
  },
  {
    name: "Whole Milk (3.5%)",
    category: "Liquid",
    pac: 0,
    pod: 0,
    solids_percent: 12.5,
    fat_percent: 3.5,
    water_percent: 87.5,
    is_dairy: true,
  },
  {
    name: "Heavy Cream (36%)",
    category: "Liquid",
    pac: 0,
    pod: 0,
    solids_percent: 41,
    fat_percent: 36,
    water_percent: 59,
    is_dairy: true,
  },
  {
    name: "Fresh Strawberry",
    category: "Fresh Fruit",
    pac: 7,
    pod: 7,
    solids_percent: 10,
    fat_percent: 0,
    water_percent: 90,
    is_dairy: false,
    dosage_guideline_per_kg: 300,
  },
  {
    name: "Fresh Lemon Juice",
    category: "Fresh Fruit",
    pac: 2,
    pod: 2,
    solids_percent: 8,
    fat_percent: 0,
    water_percent: 92,
    is_dairy: false,
    dosage_guideline_per_kg: 220,
  },
  {
    name: "Banana (Ripe)",
    category: "Fresh Fruit",
    pac: 12,
    pod: 12,
    solids_percent: 25,
    fat_percent: 0,
    water_percent: 75,
    is_dairy: false,
    dosage_guideline_per_kg: 280,
  },
];

function getSupabaseWriteClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || (!serviceRoleKey && !anonKey)) {
    return null;
  }

  return createClient(url, serviceRoleKey ?? anonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function toInsertRecord(userId: string, ingredient: SeedableIngredientRecord) {
  const record: Record<string, string | number | boolean | null> = {
    user_id: userId,
    is_master: false,
    is_cold_process: true,
    status: "verified",
    name: ingredient.name,
    name_en: ingredient.name,
    name_es: ingredient.name,
    name_it: ingredient.name,
    category: ingredient.category,
    fat_pct: ingredient.fat_percent,
    sugar_pct: Math.max(0, Math.min(100, ingredient.pod)),
    total_solids_pct: ingredient.solids_percent,
    pac_value: ingredient.pac,
    pod_value: ingredient.pod,
    water_pct: ingredient.water_percent,
    is_dairy: ingredient.is_dairy,
    dosage_guideline_per_kg: ingredient.dosage_guideline_per_kg ?? null,
    dosage_guideline: ingredient.dosage_guideline_per_kg ?? null,
    is_base_ingredient: Boolean(ingredient.is_base_ingredient),
    average_market_cost: 0,
  };

  return record;
}

async function supportsColumn(
  supabase: SupabaseClient,
  table: string,
  column: string
) {
  const probe = await supabase.from(table).select(column).limit(1);
  return !probe.error;
}

export async function seedFoundationPantry(
  userId: string,
  client?: SupabaseClient
): Promise<FoundationSeedResult> {
  if (!userId.trim()) {
    throw new Error("userId is required to seed the foundation pantry.");
  }

  const supabase = client ?? getSupabaseWriteClient();

  if (!supabase) {
    throw new Error("Supabase is not configured for foundation pantry seeding.");
  }

  const names = FOUNDATION_INGREDIENTS.map((ingredient) => ingredient.name);
  const existing = await supabase
    .from("ingredients")
    .select("name")
    .eq("user_id", userId)
    .in("name", names);

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  const existingNames = new Set((existing.data ?? []).map((row) => String(row.name)));
  const missing = FOUNDATION_INGREDIENTS.filter((ingredient) => !existingNames.has(ingredient.name));

  if (missing.length === 0) {
    return {
      inserted: 0,
      skipped: FOUNDATION_INGREDIENTS.length,
      attempted: FOUNDATION_INGREDIENTS.length,
    };
  }

  const supportsWaterPct = await supportsColumn(supabase, "ingredients", "water_pct");
  const supportsIsDairy = await supportsColumn(supabase, "ingredients", "is_dairy");

  const insert = await supabase
    .from("ingredients")
    .insert(
      missing.map((ingredient) => {
        const record = toInsertRecord(userId, ingredient);

        if (!supportsWaterPct) {
          delete record.water_pct;
        }

        if (!supportsIsDairy) {
          delete record.is_dairy;
        }

        return record;
      })
    );

  if (insert.error) {
    throw new Error(insert.error.message);
  }

  return {
    inserted: missing.length,
    skipped: FOUNDATION_INGREDIENTS.length - missing.length,
    attempted: FOUNDATION_INGREDIENTS.length,
  };
}
