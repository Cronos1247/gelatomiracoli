export type FetchedIngredientSpecs = {
  sourceUrl: string | null;
  sourceType: "pdf" | "html" | "category_average";
  estimated: boolean;
  disclaimer: string | null;
  extracted: {
    name: string;
    fat_pct: number;
    sugar_pct: number;
    total_solids_pct: number;
    solids_non_fat_pct: number;
    other_solids_pct: number;
    pac_value: number;
    pod_value: number;
    dosage_guideline: number | null;
    is_cold_process: boolean;
    category: "Flavor Paste" | "Chocolate" | "Nut" | "Other";
  };
};

export async function fetchIngredientSpecs(productName: string) {
  const response = await fetch(`/api/pantry/fetch-specs?product=${encodeURIComponent(productName)}`, {
    cache: "no-store",
  });

  const data = (await response.json()) as {
    result?: FetchedIngredientSpecs;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to fetch ingredient specs.");
  }

  if (!data.result) {
    throw new Error("No ingredient specs returned.");
  }

  return data.result;
}
