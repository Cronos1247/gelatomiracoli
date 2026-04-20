import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  publishMasterIngredientDirect,
  type MasterIngredientPayload,
} from "../_lib/master-publish";

type BatchPayloadItem = {
  name?: string;
  brand_name?: string;
  product_code?: string;
  upc?: string;
  revision_date?: string | null;
  category?: string;
  fat_pct?: number;
  sugar_pct?: number;
  total_solids_pct?: number;
  msnf_pct?: number;
  protein_g?: number;
  pac_value?: number;
  pod_value?: number;
  dosage_guideline?: number | null;
  average_market_cost?: number;
  cost_per_kg?: number;
  cost_per_container?: number;
  container_size_g?: number;
  extraction_source?: string;
  raw_ocr_dump?: string;
  is_cold_process?: boolean;
  is_dairy?: boolean;
  isVerified?: boolean;
};

export async function POST(request: Request) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service role is required for batch master publishing." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as { items?: BatchPayloadItem[] };
  const verifiedItems = (body.items ?? []).filter((item) => item.isVerified);

  if (!verifiedItems.length) {
    return NextResponse.json(
      { error: "No verified items were provided for batch publish." },
      { status: 400 }
    );
  }

  const normalizedItems = verifiedItems.map<MasterIngredientPayload>((item) => {
    const category = String(item.category ?? "Other");
    const msnfPct = Number(item.msnf_pct ?? item.protein_g ?? 0);
    const fatPct = Number(item.fat_pct ?? 0);
    const sugarPct = Number(item.sugar_pct ?? 0);
    const totalSolidsPct = Number(item.total_solids_pct ?? 0);

    return {
      name: String(item.name ?? "Scanned Ingredient"),
      brand_name: item.brand_name ? String(item.brand_name) : null,
      product_code: item.product_code ? String(item.product_code) : null,
      upc: item.upc ? String(item.upc) : null,
      revision_date: item.revision_date ? String(item.revision_date) : null,
      category,
      fat_pct: fatPct,
      sugar_pct: sugarPct,
      total_solids_pct: totalSolidsPct,
      msnf_pct: msnfPct,
      solids_non_fat_pct: msnfPct,
      other_solids_pct: Math.max(totalSolidsPct - fatPct - sugarPct - msnfPct, 0),
      pac_value: Number(item.pac_value ?? 0),
      pod_value: Number(item.pod_value ?? 0),
      cost_per_kg: Number(item.cost_per_kg ?? 0),
      average_market_cost: Number(item.average_market_cost ?? item.cost_per_kg ?? 0),
      cost_per_container: Number(
        item.cost_per_container ?? item.average_market_cost ?? item.cost_per_kg ?? 0
      ),
      container_size_g: Number(item.container_size_g ?? 1000),
      is_cold_process: item.is_cold_process !== false,
      is_base_ingredient: category === "Base" || category === "Sugar" || category === "Dairy",
      is_dairy: item.is_dairy === true,
      dosage_guideline:
        item.dosage_guideline === null || item.dosage_guideline === undefined
          ? null
          : Number(item.dosage_guideline),
      pdf_url: null,
      raw_ocr_dump: String(item.raw_ocr_dump ?? ""),
      extraction_source:
        item.extraction_source === "Nutritional Fallback"
          ? "Nutritional Fallback"
          : "Balancing Parameters",
      status: "verified",
    };
  });
  try {
    const committedItems = [];

    for (const item of normalizedItems) {
      const committed = await publishMasterIngredientDirect(supabase, item);
      committedItems.push(committed);
    }

    return NextResponse.json({
      items: committedItems,
      committed: committedItems.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Batch publish failed." },
      { status: 500 }
    );
  }
}
