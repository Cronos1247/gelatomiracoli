export type MobileIngredient = {
  id?: string;
  name: string;
  name_en?: string | null;
  name_es?: string | null;
  name_it?: string | null;
  category?: string | null;
  is_flavor?: boolean | null;
  is_cold_process?: boolean | null;
  is_base_ingredient?: boolean | null;
  brand_name?: string | null;
  product_code?: string | null;
  fat_pct?: number | null;
  sugar_pct?: number | null;
  total_solids_pct?: number | null;
  water_pct?: number | null;
  pac_value?: number | null;
  pod_value?: number | null;
  is_master?: boolean | null;
  is_global?: boolean | null;
  is_verified?: boolean | null;
  dosage_guideline_per_kg?: number | null;
  dosage_guideline?: number | null;
  cost_per_container?: number | null;
  container_size_g?: number | null;
  status?: string | null;
  average_market_cost?: number | null;
};

export type MobileSavedRecipeItem = {
  recipe_id?: string;
  ingredient_name: string;
  grams: number;
  percentage: number;
};

export type MobileSavedRecipe = {
  id: string;
  name: string;
  archetype: string;
  total_pac: number;
  total_pod: number;
  total_solids: number;
  created_at: string;
  total_weight_grams: number;
  equipment_id?: string | null;
  logic_snapshot?: Record<string, unknown> | null;
  is_sorbet?: boolean | null;
  is_on_display: boolean;
  active_case_id: string | null;
  items: MobileSavedRecipeItem[];
};

export type DisplayCase = {
  id: string;
  user_id: string;
  name: string;
  capacity_pans: number;
  target_temp_c: number;
  pac_range_min: number;
  pac_range_max: number;
  display_order: number;
  active_recipes?: MobileSavedRecipe[];
};

export type ArchetypeKey =
  | "milk-based-standard"
  | "high-fat"
  | "fruit-sorbet"
  | "low-sugar"
  | "clean-label"
  | "vegan"
  | "sugar-free";

export type Archetype = {
  key: ArchetypeKey;
  label: string;
  subtitle: string;
  fat: number;
  sugar: number;
  solids: number;
  pac: number;
  pod: number;
};

export type MaestroDraft = {
  title: string;
  archetype: Archetype;
  matchedIngredients: MobileIngredient[];
  notes: string[];
};

export type PantryLoadResult = {
  source: "combined_pantry" | "ingredients" | "fallback";
  ingredients: MobileIngredient[];
};

export type RecipeLoadResult = {
  source: "supabase" | "api" | "fallback";
  recipes: MobileSavedRecipe[];
};
