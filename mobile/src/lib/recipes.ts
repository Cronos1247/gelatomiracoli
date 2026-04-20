import { getWebApiBaseUrl } from "./config";
import { mobileSupabase } from "./supabase";
import type {
  MobileSavedRecipe,
  MobileSavedRecipeItem,
  RecipeLoadResult,
} from "../types";

function normalizeRecipeItem(record: Record<string, unknown>): MobileSavedRecipeItem {
  return {
    recipe_id: typeof record.recipe_id === "string" ? record.recipe_id : undefined,
    ingredient_name:
      typeof record.ingredient_name === "string" ? record.ingredient_name : "Ingredient",
    grams: typeof record.grams === "number" ? record.grams : Number(record.grams ?? 0),
    percentage:
      typeof record.percentage === "number" ? record.percentage : Number(record.percentage ?? 0),
  };
}

function normalizeSavedRecipe(record: Record<string, unknown>): MobileSavedRecipe {
  const items = Array.isArray(record.items)
    ? record.items.map((item) => normalizeRecipeItem(item as Record<string, unknown>))
    : [];
  const logicSnapshot =
    record.logic_snapshot && typeof record.logic_snapshot === "object"
      ? (record.logic_snapshot as Record<string, unknown>)
      : null;

  return {
    id: typeof record.id === "string" ? record.id : "recipe",
    name: typeof record.name === "string" ? record.name : "Untitled Recipe",
    archetype:
      typeof record.archetype === "string"
        ? record.archetype
        : typeof logicSnapshot?.archetypeKey === "string"
          ? String(logicSnapshot.archetypeKey)
          : "unknown",
    total_pac:
      typeof record.total_pac === "number"
        ? record.total_pac
        : Number((logicSnapshot?.totalPac ?? logicSnapshot?.targetPac ?? 0) as number),
    total_pod:
      typeof record.total_pod === "number"
        ? record.total_pod
        : Number((logicSnapshot?.totalPod ?? logicSnapshot?.targetPodPct ?? 0) as number),
    total_solids:
      typeof record.total_solids === "number"
        ? record.total_solids
        : Number((logicSnapshot?.totalSolids ?? logicSnapshot?.targetSolidsPct ?? 0) as number),
    created_at:
      typeof record.created_at === "string" ? record.created_at : new Date(0).toISOString(),
    total_weight_grams:
      typeof record.total_weight_grams === "number"
        ? record.total_weight_grams
        : Number(record.total_weight_grams ?? 0),
    equipment_id: typeof record.equipment_id === "string" ? record.equipment_id : null,
    logic_snapshot: logicSnapshot,
    is_sorbet: Boolean(record.is_sorbet),
    is_on_display: Boolean(record.is_on_display),
    active_case_id: typeof record.active_case_id === "string" ? record.active_case_id : null,
    items: [...items].sort((left, right) => right.grams - left.grams),
  };
}

async function fetchRecipesWithDisplayFields() {
  const preferred = await mobileSupabase!
    .from("recipes")
    .select(
      "id, name, created_at, total_weight_grams, equipment_id, logic_snapshot, is_sorbet, active_case_id, is_on_display"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (!preferred.error) {
    return preferred;
  }

  return mobileSupabase!
    .from("recipes")
    .select("id, name, created_at, total_weight_grams, equipment_id, logic_snapshot, is_sorbet")
    .order("created_at", { ascending: false })
    .limit(200);
}

async function loadRecipesFromSupabase(): Promise<RecipeLoadResult | null> {
  if (!mobileSupabase) {
    return null;
  }

  const recipes = await fetchRecipesWithDisplayFields();

  if (recipes.error) {
    throw new Error(recipes.error.message);
  }

  const recipeRows = (recipes.data ?? []) as Record<string, unknown>[];
  const recipeIds = recipeRows
    .map((recipe) => (typeof recipe.id === "string" ? recipe.id : ""))
    .filter(Boolean);

  const items = recipeIds.length
    ? await mobileSupabase
        .from("recipe_items")
        .select("recipe_id, ingredient_name, grams, percentage")
        .in("recipe_id", recipeIds)
    : { data: [] as Record<string, unknown>[], error: null };

  if (items.error) {
    throw new Error(items.error.message);
  }

  const itemsByRecipeId = new Map<string, MobileSavedRecipeItem[]>();

  for (const row of (items.data ?? []) as Record<string, unknown>[]) {
    const item = normalizeRecipeItem(row);
    const recipeId = item.recipe_id;

    if (!recipeId) {
      continue;
    }

    const existing = itemsByRecipeId.get(recipeId) ?? [];
    existing.push(item);
    itemsByRecipeId.set(recipeId, existing);
  }

  return {
    source: "supabase",
    recipes: recipeRows.map((row) =>
      normalizeSavedRecipe({
        ...row,
        items: itemsByRecipeId.get(typeof row.id === "string" ? row.id : "") ?? [],
      })
    ),
  };
}

async function loadRecipesFromApi(): Promise<RecipeLoadResult | null> {
  const baseUrl = getWebApiBaseUrl();

  if (!baseUrl) {
    return null;
  }

  const response = await fetch(`${baseUrl}/api/recipes`);
  const payload = (await response.json()) as {
    error?: string;
    recipes?: Record<string, unknown>[];
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to fetch saved recipes.");
  }

  return {
    source: "api",
    recipes: Array.isArray(payload.recipes) ? payload.recipes.map(normalizeSavedRecipe) : [],
  };
}

export async function loadSavedRecipes(): Promise<RecipeLoadResult> {
  try {
    const supabaseResult = await loadRecipesFromSupabase();

    if (supabaseResult) {
      return supabaseResult;
    }
  } catch (error) {
    try {
      const apiResult = await loadRecipesFromApi();

      if (apiResult) {
        return apiResult;
      }
    } catch {
      throw error;
    }

    throw error;
  }

  const apiResult = await loadRecipesFromApi();

  if (apiResult) {
    return apiResult;
  }

  return {
    source: "fallback",
    recipes: [],
  };
}
