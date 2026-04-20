import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RecipeVaultGrid, type RecipeVaultCard } from "@/components/portal/RecipeVaultGrid";

type RecipeRow = {
  id: string;
  name: string | null;
  total_weight_grams: number | null;
  logic_snapshot: Record<string, unknown> | null;
  is_sorbet: boolean | null;
};

type RecipeItemRow = {
  recipe_id: string | null;
  ingredient_name: string | null;
  grams: number | null;
  percentage: number | null;
};

function normalizeNumber(value: unknown) {
  const next = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

export const dynamic = "force-dynamic";

export default async function PortalLibraryPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return <RecipeVaultGrid recipes={[]} />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const recipeResult = await supabase
    .from("recipes")
    .select("id, name, total_weight_grams, logic_snapshot, is_sorbet")
    .eq("user_id", user?.id ?? "__no_user__")
    .order("created_at", { ascending: false })
    .limit(24);

  if (recipeResult.error) {
    return <RecipeVaultGrid recipes={[]} />;
  }

  const recipeRows = (recipeResult.data ?? []) as RecipeRow[];
  const recipeIds = recipeRows.map((recipe) => recipe.id).filter(Boolean);
  const itemResult = recipeIds.length
    ? await supabase
        .from("recipe_items")
        .select("recipe_id, ingredient_name, grams, percentage")
        .in("recipe_id", recipeIds)
    : { data: [] as RecipeItemRow[], error: null };

  const itemsByRecipeId = new Map<string, RecipeItemRow[]>();
  for (const item of (itemResult.data ?? []) as RecipeItemRow[]) {
    const key = typeof item.recipe_id === "string" ? item.recipe_id : "";
    if (!key) {
      continue;
    }
    const existing = itemsByRecipeId.get(key) ?? [];
    existing.push(item);
    itemsByRecipeId.set(key, existing);
  }

  const recipes: RecipeVaultCard[] = recipeRows.map((recipe) => {
    const logic = recipe.logic_snapshot ?? {};
    const items = (itemsByRecipeId.get(recipe.id) ?? []).map((item) => ({
      ingredient_name: item.ingredient_name ? String(item.ingredient_name) : "Ingredient",
      grams: normalizeNumber(item.grams),
      percentage: normalizeNumber(item.percentage),
    }));
    const totalWeight = normalizeNumber(recipe.total_weight_grams);
    const estimatedCost = normalizeNumber((logic as Record<string, unknown>).estimatedCost);
    const costPerKg = totalWeight > 0 ? estimatedCost / (totalWeight / 1000) : 0;

    return {
      id: recipe.id,
      name: recipe.name ?? "Untitled Formula",
      archetype:
        typeof logic.archetypeKey === "string" ? String(logic.archetypeKey) : "custom",
      type: recipe.is_sorbet ? "Sorbet" : "Gelato",
      pac: normalizeNumber(logic.totalPac),
      pod: normalizeNumber(logic.totalPod),
      costPerKg: Number.isFinite(costPerKg) ? costPerKg : 0,
      items,
    };
  });

  return <RecipeVaultGrid recipes={recipes} />;
}
