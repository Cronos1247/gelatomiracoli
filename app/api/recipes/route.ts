import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { RecipeBookEntry } from "@/lib/storage";

type RecipeRow = {
  id: string;
  name: string | null;
  created_at: string | null;
  total_weight_grams: number | null;
  equipment_id: string | null;
  logic_snapshot: Record<string, unknown> | null;
  is_sorbet: boolean | null;
  active_case_id?: string | null;
  is_on_display?: boolean | null;
  archetype?: string | null;
  total_pac?: number | null;
  total_pod?: number | null;
  total_solids?: number | null;
};

type RecipeItemRow = {
  recipe_id: string | null;
  ingredient_name: string | null;
  grams: number | null;
  percentage: number | null;
};

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

function normalizeRecipePayload(recipes: RecipeRow[], items: RecipeItemRow[]) {
  const itemsByRecipeId = new Map<
    string,
    Array<{
      ingredient_name: string;
      grams: number;
      percentage: number;
    }>
  >();

  for (const item of items) {
    const recipeId = typeof item.recipe_id === "string" ? item.recipe_id : "";

    if (!recipeId) {
      continue;
    }

    const existing = itemsByRecipeId.get(recipeId) ?? [];
    existing.push({
      ingredient_name: item.ingredient_name ? String(item.ingredient_name) : "Ingredient",
      grams: Number(item.grams ?? 0),
      percentage: Number(item.percentage ?? 0),
    });
    itemsByRecipeId.set(recipeId, existing);
  }

  return recipes.map((recipe) => ({
    archetype:
      typeof recipe.archetype === "string"
        ? recipe.archetype
        : typeof recipe.logic_snapshot?.archetypeKey === "string"
          ? String(recipe.logic_snapshot.archetypeKey)
          : "unknown",
    id: String(recipe.id),
    name: recipe.name ? String(recipe.name) : "Untitled Recipe",
    total_pac:
      typeof recipe.total_pac === "number"
        ? recipe.total_pac
        : Number(
            (recipe.logic_snapshot?.totalPac ??
              recipe.logic_snapshot?.targetPac ??
              0) as number
          ),
    total_pod:
      typeof recipe.total_pod === "number"
        ? recipe.total_pod
        : Number(
            (recipe.logic_snapshot?.totalPod ??
              recipe.logic_snapshot?.targetPodPct ??
              0) as number
          ),
    total_solids:
      typeof recipe.total_solids === "number"
        ? recipe.total_solids
        : Number(
            (recipe.logic_snapshot?.totalSolids ??
              recipe.logic_snapshot?.targetSolidsPct ??
              0) as number
          ),
    created_at: recipe.created_at ? String(recipe.created_at) : new Date(0).toISOString(),
    total_weight_grams: Number(recipe.total_weight_grams ?? 0),
    equipment_id: recipe.equipment_id ? String(recipe.equipment_id) : null,
    logic_snapshot: recipe.logic_snapshot ?? null,
    is_sorbet: Boolean(recipe.is_sorbet),
    is_on_display: Boolean(recipe.is_on_display),
    active_case_id: typeof recipe.active_case_id === "string" ? recipe.active_case_id : null,
    items: (itemsByRecipeId.get(String(recipe.id)) ?? []).sort((left, right) => right.grams - left.grams),
  }));
}

async function fetchRecipesWithDisplayFields(
  supabase: NonNullable<ReturnType<typeof getSupabaseWriteClient>>
) {
  const preferred = await supabase
    .from("recipes")
    .select(
      "id, name, created_at, total_weight_grams, equipment_id, logic_snapshot, is_sorbet, active_case_id, is_on_display"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (!preferred.error) {
    return preferred;
  }

  return supabase
    .from("recipes")
    .select("id, name, created_at, total_weight_grams, equipment_id, logic_snapshot, is_sorbet")
    .order("created_at", { ascending: false })
    .limit(200);
}

export async function GET() {
  const supabase = getSupabaseWriteClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured for recipe snapshots." },
      { status: 500 }
    );
  }

  const recipeResult = await fetchRecipesWithDisplayFields(supabase);

  if (recipeResult.error) {
    return NextResponse.json({ error: recipeResult.error.message }, { status: 500 });
  }

  const recipeRows = (recipeResult.data ?? []) as RecipeRow[];
  const recipeIds = recipeRows.map((recipe) => recipe.id).filter(Boolean);
  const itemResult = recipeIds.length
    ? await supabase
        .from("recipe_items")
        .select("recipe_id, ingredient_name, grams, percentage")
        .in("recipe_id", recipeIds)
    : { data: [] as RecipeItemRow[], error: null };

  if (itemResult.error) {
    return NextResponse.json({ error: itemResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    recipes: normalizeRecipePayload(recipeRows, (itemResult.data ?? []) as RecipeItemRow[]),
  });
}

export async function POST(request: Request) {
  const supabase = getSupabaseWriteClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured for recipe snapshots." },
      { status: 500 }
    );
  }

  const payload = (await request.json()) as Partial<RecipeBookEntry>;

  if (!payload.recipeName || !payload.createdAt || !payload.logicSnapshot) {
    return NextResponse.json({ error: "Invalid recipe snapshot payload." }, { status: 400 });
  }

  const recipeInsert = {
    name: String(payload.recipeName),
    user_id: null,
    created_at: String(payload.createdAt),
    total_weight_grams: Number(payload.totalMixWeight ?? 0),
    equipment_id: payload.equipmentId ? String(payload.equipmentId) : null,
    active_case_id:
      typeof (payload as { activeCaseId?: unknown }).activeCaseId === "string"
        ? String((payload as { activeCaseId?: string }).activeCaseId)
        : null,
    is_on_display: Boolean((payload as { isOnDisplay?: unknown }).isOnDisplay),
    logic_snapshot: payload.logicSnapshot,
    is_sorbet: Boolean(payload.isSorbet),
  };

  const recipeResult = await supabase
    .from("recipes")
    .insert(recipeInsert)
    .select("id, created_at")
    .single();

  if (recipeResult.error || !recipeResult.data) {
    return NextResponse.json(
      { error: recipeResult.error?.message ?? "Recipe insert failed." },
      { status: 500 }
    );
  }

  const ingredientNames =
    payload.ingredients
      ?.map((ingredient) => String(ingredient.name ?? ""))
      .filter(Boolean) ?? [];
  const pantryLookup = ingredientNames.length
    ? await supabase.from("ingredients").select("id, name").in("name", ingredientNames)
    : { data: [], error: null };

  if (pantryLookup.error) {
    await supabase.from("recipes").delete().eq("id", recipeResult.data.id);

    return NextResponse.json({ error: pantryLookup.error.message }, { status: 500 });
  }

  const ingredientIdByName = new Map(
    (pantryLookup.data ?? []).map((ingredient) => [String(ingredient.name), String(ingredient.id)])
  );
  const itemRows =
    payload.ingredients?.map((ingredient) => ({
      recipe_id: recipeResult.data.id,
      ingredient_id: ingredientIdByName.get(String(ingredient.name ?? "")) ?? null,
      grams: Number(ingredient.grams ?? 0),
      percentage: Number(ingredient.percentage ?? 0),
      ingredient_name: String(ingredient.name ?? "Ingredient"),
    })) ?? [];

  if (itemRows.length) {
    const itemInsert = await supabase.from("recipe_items").insert(itemRows);

    if (itemInsert.error) {
      await supabase.from("recipes").delete().eq("id", recipeResult.data.id);

      return NextResponse.json({ error: itemInsert.error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    recipeId: recipeResult.data.id,
    syncedAt: recipeResult.data.created_at,
  });
}
