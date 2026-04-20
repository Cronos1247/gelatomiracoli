"use client";

import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import type { ParsedIngredientPdf } from "@/lib/process-ingredient-pdf";

export type ValidationStatus = "verified" | "warning" | "error";

export type ParsedIngredientValidation = {
  status: ValidationStatus;
  label: string;
  reason: string | null;
  isDuplicate: boolean;
};

export async function loadDuplicateProductCodes(productCodes: string[]) {
  const normalizedCodes = Array.from(
    new Set(
      productCodes
        .map((code) => code.trim())
        .filter(Boolean)
        .map((code) => code.toUpperCase())
    )
  );

  if (!normalizedCodes.length) {
    return new Set<string>();
  }

  const client = getBrowserSupabaseClient();

  if (!client) {
    return new Set<string>();
  }

  const { data, error } = await client
    .from("ingredients")
    .select("product_code")
    .in("product_code", normalizedCodes);

  if (error || !data) {
    return new Set<string>();
  }

  return new Set(
    (data as Array<{ product_code?: string | null }>)
      .map((row) => String(row.product_code ?? "").trim().toUpperCase())
      .filter(Boolean)
  );
}

export async function validateParsedIngredient(
  data: ParsedIngredientPdf["extracted"],
  options?: {
    duplicateProductCodes?: Set<string>;
    parsed?: ParsedIngredientPdf;
  }
): Promise<ParsedIngredientValidation> {
  const fat = Number(data.fat_pct ?? 0);
  const sugar = Number(data.sugar_pct ?? 0);
  const msnf = Number(data.msnf_pct ?? data.protein_g ?? 0);
  const totalSolids = Number(data.total_solids_pct ?? 0);
  const normalizedProductCode = String(data.product_code ?? "").trim().toUpperCase();
  const normalizedName = String(data.name ?? "").toLowerCase();
  const warningFlags = new Set(options?.parsed?.warningFlags ?? []);
  const isManualDoseProduct =
    data.category === "Base/Stabilizer" ||
    normalizedName.includes("neutro") ||
    /\bbase\b/.test(normalizedName);

  if (isManualDoseProduct && Number(data.dosage_guideline ?? 0) > 0) {
    return {
      status: "verified",
      label: "Verified Functional Base",
      reason: warningFlags.has("verified_functional_base")
        ? "Functional base verified from dosage guidance."
        : null,
      isDuplicate: false,
    };
  }

  if (isManualDoseProduct && fat <= 0 && totalSolids <= 0) {
    return {
      status: "warning",
      label: "Manual Review Required",
      reason:
        "Neutro/base sheet is missing nutrition data. Use the dosage from Instructions For Use and review manually.",
      isDuplicate: false,
    };
  }

  if (fat <= 0 || totalSolids <= 0) {
    return {
      status: "error",
      label: "Incomplete",
      reason: "Missing fat or total solids from the parsed balancing data.",
      isDuplicate: false,
    };
  }

  if (fat + sugar + msnf > totalSolids + 0.25) {
    return {
      status: "error",
      label: "Impossible Physics",
      reason: "Fat + sugar + MSNF exceeds total solids.",
      isDuplicate: false,
    };
  }

  const duplicateSet =
    options?.duplicateProductCodes ??
    (normalizedProductCode
      ? await loadDuplicateProductCodes([normalizedProductCode])
      : new Set<string>());

  if (normalizedProductCode && duplicateSet.has(normalizedProductCode)) {
    return {
      status: "warning",
      label: "Duplicate/Update",
      reason: "This product code already exists and should be treated as an update review.",
      isDuplicate: true,
    };
  }

  if (
    data.extraction_source === "Nutritional Fallback" &&
    fat >= 0 &&
    sugar >= 0 &&
    totalSolids > 0
  ) {
    return {
      status: "verified",
      label: "Verified (Nutritional Fallback)",
      reason: "Verified from nutrition labelling because balancing parameters were absent.",
      isDuplicate: false,
    };
  }

  if (fat < 0.01 || sugar < 0) {
    return {
      status: "warning",
      label: isManualDoseProduct ? "Manual Review Required" : "Low Confidence",
      reason: isManualDoseProduct
        ? "Parsed from limited label data. Confirm dosage and balancing values manually."
        : "Parsed with fallback nutrition data or weak balancing coverage.",
      isDuplicate: false,
    };
  }

  return {
    status: "verified",
    label: "High Confidence",
    reason: null,
    isDuplicate: false,
  };
}
