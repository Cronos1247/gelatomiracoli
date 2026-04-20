import { getWebApiBaseUrl } from "./config";

type SaveRecipeIngredient = {
  name: string;
  grams: number;
  percentage: number;
};

type SaveRecipeToLibraryOptions = {
  recipeName: string;
  totalMixWeight: number;
  equipmentId: string | null;
  activeCaseId: string | null;
  isOnDisplay: boolean;
  isSorbet: boolean;
  ingredients: SaveRecipeIngredient[];
  logicSnapshot: Record<string, unknown>;
};

export async function saveRecipeToLibrary(options: SaveRecipeToLibraryOptions) {
  const baseUrl = getWebApiBaseUrl();

  if (!baseUrl) {
    throw new Error("WEB API base URL is not configured for recipe sync.");
  }

  const response = await fetch(`${baseUrl}/api/recipes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipeName: options.recipeName,
      createdAt: new Date().toISOString(),
      totalMixWeight: options.totalMixWeight,
      equipmentId: options.equipmentId,
      activeCaseId: options.activeCaseId,
      isOnDisplay: options.isOnDisplay,
      isSorbet: options.isSorbet,
      ingredients: options.ingredients,
      logicSnapshot: options.logicSnapshot,
    }),
  });

  const payload = (await response.json()) as { error?: string; recipeId?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to save recipe to vault.");
  }

  return payload;
}
