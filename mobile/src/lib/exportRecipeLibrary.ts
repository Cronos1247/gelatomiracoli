import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { MobileSavedRecipe } from "../types";

function escapeCsv(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function formatIngredients(recipe: MobileSavedRecipe) {
  return recipe.items
    .map((item) => `${item.ingredient_name}: ${Math.round(item.grams)}g`)
    .join(" | ");
}

export async function exportRecipeLibrary(recipes: MobileSavedRecipe[]) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  const header = [
    "Name",
    "Archetype",
    "PAC",
    "POD",
    "Solids",
    "WeightGrams",
    "CreatedAt",
    "Ingredients",
  ];

  const rows = recipes.map((recipe) =>
    [
      recipe.name,
      recipe.archetype,
      recipe.total_pac.toFixed(1),
      recipe.total_pod.toFixed(1),
      recipe.total_solids.toFixed(1),
      Math.round(recipe.total_weight_grams),
      recipe.created_at,
      formatIngredients(recipe),
    ]
      .map((value) => escapeCsv(value))
      .join(",")
  );

  const csv = [header.map((value) => escapeCsv(value)).join(","), ...rows].join("\n");
  const file = new File(Paths.cache, `miracoli-recipe-library-${Date.now()}.csv`);
  file.create({ overwrite: true });
  file.write(csv);

  await Sharing.shareAsync(file.uri, {
    dialogTitle: "Export Recipe Library",
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
  });
}
