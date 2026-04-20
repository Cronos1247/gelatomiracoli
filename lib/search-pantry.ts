import type { ParsedIngredientPdf } from "@/lib/process-ingredient-pdf";

export type SearchPantryResult = {
  title: string;
  url: string;
  parsed?: ParsedIngredientPdf | null;
};

export async function searchPantry(query: string) {
  const response = await fetch(`/api/pantry/search-tech-sheet?q=${encodeURIComponent(query)}`, {
    cache: "no-store",
  });

  const data = (await response.json()) as {
    results?: SearchPantryResult[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to search for technical sheets.");
  }

  return data.results ?? [];
}
