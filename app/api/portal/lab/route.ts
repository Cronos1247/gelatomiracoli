import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LabSaveIngredient = {
  ingredientId?: string;
  name?: string;
  grams?: number;
  percentage?: number;
  category?: string;
};

type LabSavePayload = {
  recipeName?: string;
  ingredients?: LabSaveIngredient[];
  totalPac?: number;
  totalPod?: number;
  totalSolids?: number;
  totalFat?: number;
  totalMixWeight?: number;
  totalRecipeCost?: number;
  archetypeKey?: string;
  baseType?: string;
  batchLiters?: number;
  flavorIntensityPct?: number;
  podBias?: number;
  equipmentId?: string | null;
  activeCaseId?: string | null;
  overrunTargetPct?: number;
  keyword?: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured for portal recipe saving." },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = (await request.json()) as LabSavePayload;
  const recipeName = String(payload.recipeName ?? "").trim();
  const ingredients = Array.isArray(payload.ingredients) ? payload.ingredients : [];

  if (!recipeName || ingredients.length === 0) {
    return NextResponse.json(
      { error: "Recipe name and ingredients are required." },
      { status: 400 }
    );
  }

  const recipeInsert = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      name: recipeName,
      created_at: new Date().toISOString(),
      total_weight_grams: Number(payload.totalMixWeight ?? 0),
      equipment_id: typeof payload.equipmentId === "string" ? payload.equipmentId : null,
      active_case_id: typeof payload.activeCaseId === "string" ? payload.activeCaseId : null,
      is_on_display: typeof payload.activeCaseId === "string",
      is_sorbet:
        payload.baseType === "water" ||
        payload.archetypeKey === "fruit-sorbet" ||
        payload.archetypeKey === "vegan",
      logic_snapshot: {
        archetypeKey:
          typeof payload.archetypeKey === "string" ? payload.archetypeKey : "portal-lab",
        baseType: typeof payload.baseType === "string" ? payload.baseType : "dairy",
        batchLiters: Number(payload.batchLiters ?? 1),
        flavorIntensityPct: Number(payload.flavorIntensityPct ?? 10),
        podBias: Number(payload.podBias ?? 1),
        overrunTargetPct: Number(payload.overrunTargetPct ?? 35),
        keyword: typeof payload.keyword === "string" ? payload.keyword : recipeName,
        estimatedCost: Number(payload.totalRecipeCost ?? 0),
        totalPac: Number(payload.totalPac ?? 0),
        totalPod: Number(payload.totalPod ?? 0),
        totalSolids: Number(payload.totalSolids ?? 0),
        totalFat: Number(payload.totalFat ?? 0),
        ingredients_json: ingredients.map((ingredient) => ({
          name: String(ingredient.name ?? "Ingredient"),
          grams: Number(ingredient.grams ?? 0),
          percentage: Number(ingredient.percentage ?? 0),
          category: typeof ingredient.category === "string" ? ingredient.category : "Other",
        })),
      },
    })
    .select("id, created_at")
    .single();

  if (recipeInsert.error || !recipeInsert.data) {
    return NextResponse.json(
      { error: recipeInsert.error?.message ?? "Unable to save recipe." },
      { status: 500 }
    );
  }

  const itemRows = ingredients.map((ingredient) => ({
    recipe_id: recipeInsert.data.id,
    ingredient_id:
      typeof ingredient.ingredientId === "string" ? ingredient.ingredientId : null,
    ingredient_name: String(ingredient.name ?? "Ingredient"),
    grams: Number(ingredient.grams ?? 0),
    percentage: Number(ingredient.percentage ?? 0),
  }));

  const itemInsert = await supabase.from("recipe_items").insert(itemRows);

  if (itemInsert.error) {
    await supabase.from("recipes").delete().eq("id", recipeInsert.data.id);
    return NextResponse.json({ error: itemInsert.error.message }, { status: 500 });
  }

  return NextResponse.json({
    recipeId: recipeInsert.data.id,
    savedAt: recipeInsert.data.created_at,
  });
}
