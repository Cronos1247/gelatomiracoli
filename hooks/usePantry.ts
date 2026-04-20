import { startTransition, useEffect, useMemo, useState } from "react";
import type { Ingredient } from "@/lib/default-data";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type UsePantryOptions = {
  initialIngredients: Ingredient[];
};

type PantryIngredientRecord = Partial<Ingredient> & {
  dosage_guideline_per_kg?: number | null;
};

function normalizeIngredient(item: PantryIngredientRecord) {
  const msnf = Number(item.solids_non_fat_pct ?? 0);
  const otherSolids = Number(item.other_solids_pct ?? 0);
  const pacValue = Number(item.pac_value ?? 0);
  const podValue = Number(item.pod_value ?? 0);

  return {
    id: item.id ?? `${String(item.name ?? "ingredient").toLowerCase().replace(/\s+/g, "-")}`,
    name: String(item.name ?? "Ingredient"),
    brand_name: item.brand_name ? String(item.brand_name) : null,
    product_code: item.product_code ? String(item.product_code) : null,
    upc: item.upc ? String(item.upc) : null,
    revision_date: item.revision_date ? String(item.revision_date) : null,
    category: (item.category as Ingredient["category"]) ?? "Other",
    fat_pct: Number(item.fat_pct ?? 0),
    sugar_pct: Number(item.sugar_pct ?? 0),
    total_solids_pct: Number(
      item.total_solids_pct ?? Number(item.fat_pct ?? 0) + Number(item.sugar_pct ?? 0) + msnf + otherSolids
    ),
    msnf_pct: Number(item.msnf_pct ?? msnf),
    solids_non_fat_pct: msnf,
    other_solids_pct: otherSolids,
    pac_value: pacValue > 0 && pacValue <= 10 ? pacValue * 100 : pacValue,
    pod_value: podValue > 0 && podValue <= 10 ? podValue * 100 : podValue,
    cost_per_kg: Number(item.cost_per_kg ?? 0),
    average_market_cost: Number(item.average_market_cost ?? item.cost_per_kg ?? 0),
    is_cold_process: Boolean(item.is_cold_process),
    is_base_ingredient: Boolean(item.is_base_ingredient ?? false),
    is_master: Boolean(item.is_master ?? false),
    dosage_guideline:
      item.dosage_guideline === null || item.dosage_guideline === undefined
        ? item.dosage_guideline_per_kg === null || item.dosage_guideline_per_kg === undefined
          ? null
          : Number(item.dosage_guideline_per_kg)
        : Number(item.dosage_guideline),
    pdf_url: item.pdf_url ? String(item.pdf_url) : null,
    raw_ocr_dump: item.raw_ocr_dump ? String(item.raw_ocr_dump) : null,
    extraction_source:
      item.extraction_source === "Nutritional Fallback" ? "Nutritional Fallback" : "Balancing Parameters",
    user_id: item.user_id ?? null,
    data_priority: (item.data_priority as Ingredient["data_priority"]) ?? "verified_lab_data",
  } satisfies Ingredient;
}

export function usePantry({ initialIngredients }: UsePantryOptions) {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadIngredients() {
      const client = getBrowserSupabaseClient();

      if (!client) {
        return;
      }

      setLoading(true);
      setError(null);

      const combined = await client.from("combined_pantry").select("*").order("name");
      const data = combined.error
        ? await client.from("ingredients").select("*").order("name")
        : combined;

      if (cancelled) {
        return;
      }

      if (data.error) {
        setError(data.error.message);
        setLoading(false);
        return;
      }

      startTransition(() => {
        setIngredients((data.data as PantryIngredientRecord[]).map(normalizeIngredient));
      });
      setLoading(false);
    }

    void loadIngredients();

    return () => {
      cancelled = true;
    };
  }, []);

  const baseIngredients = useMemo(
    () => ingredients.filter((ingredient) => ingredient.is_base_ingredient),
    [ingredients]
  );
  const masterIngredients = useMemo(
    () => ingredients.filter((ingredient) => ingredient.is_master),
    [ingredients]
  );
  const customIngredients = useMemo(
    () => ingredients.filter((ingredient) => !ingredient.is_master),
    [ingredients]
  );

  const refresh = async () => {
    const client = getBrowserSupabaseClient();

    if (!client) {
      return;
    }

    setLoading(true);
    setError(null);

    const combined = await client.from("combined_pantry").select("*").order("name");
    const data = combined.error
      ? await client.from("ingredients").select("*").order("name")
      : combined;

    if (data.error) {
      setError(data.error.message);
      setLoading(false);
      return;
    }

    startTransition(() => {
      setIngredients((data.data as PantryIngredientRecord[]).map(normalizeIngredient));
    });
    setLoading(false);
  };

  return {
    ingredients,
    baseIngredients,
    masterIngredients,
    customIngredients,
    loading,
    error,
    refresh,
    addOptimisticIngredient: (ingredient: Ingredient) =>
      setIngredients((current) => {
        const next = current.filter((candidate) => candidate.name !== ingredient.name);
        return [ingredient, ...next];
      }),
  };
}
