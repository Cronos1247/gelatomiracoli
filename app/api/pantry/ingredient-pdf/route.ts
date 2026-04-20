import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { publishMasterIngredientDirect, type MasterIngredientPayload } from "../_lib/master-publish";

const STORAGE_BUCKET = "ingredient-tech-sheets";

function sanitizeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
}

function extractSupabaseErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    return (
      [
        "message" in error && typeof error.message === "string" ? error.message : null,
        "details" in error && typeof error.details === "string" ? error.details : null,
        "hint" in error && typeof error.hint === "string" ? error.hint : null,
        "code" in error && typeof error.code === "string" ? `code ${error.code}` : null,
      ]
        .filter(Boolean)
        .join(" | ") || JSON.stringify(error)
    );
  }

  return String(error ?? "Unknown error");
}

function shouldRetryWithoutIsDairy(error: unknown) {
  const message = extractSupabaseErrorMessage(error);
  return /column ["']?is_dairy["']?.+does not exist|Could not find the 'is_dairy' column/i.test(
    message
  );
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || (!serviceRoleKey && !anonKey)) {
    return NextResponse.json(
      { error: "Supabase is not configured for pantry uploads." },
      { status: 500 }
    );
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const pdf = formData.get("pdf");
  const payload = formData.get("payload");

  if (!(pdf instanceof File) || typeof payload !== "string") {
    return NextResponse.json({ error: "Invalid upload payload." }, { status: 400 });
  }

  const parsedPayload = JSON.parse(payload) as Record<string, unknown>;
  const supabase = createClient(url, serviceRoleKey ?? anonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const path = `uploads/${Date.now()}-${sanitizeFileName(pdf.name)}`;
  const upload = await supabase.storage.from(STORAGE_BUCKET).upload(path, await pdf.arrayBuffer(), {
    contentType: "application/pdf",
    upsert: false,
  });

  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const category = String(parsedPayload.category ?? "Other");
  const publishToMaster = Boolean(parsedPayload.publish_to_master);
  const dosageGuideline =
    parsedPayload.dosage_guideline === null || parsedPayload.dosage_guideline === undefined
      ? null
      : Number(parsedPayload.dosage_guideline);
  const msnfPct = Number(parsedPayload.msnf_pct ?? parsedPayload.protein_g ?? 0);
  const totalSolidsPct = Number(parsedPayload.total_solids_pct ?? 0);
  const fatPct = Number(parsedPayload.fat_pct ?? 0);
  const sugarPct = Number(parsedPayload.sugar_pct ?? 0);
  const basePayload: MasterIngredientPayload = {
    name: String(parsedPayload.name ?? "Scanned Ingredient"),
    brand_name: parsedPayload.brand_name ? String(parsedPayload.brand_name) : null,
    product_code: parsedPayload.product_code ? String(parsedPayload.product_code) : null,
    upc: parsedPayload.upc ? String(parsedPayload.upc) : null,
    revision_date: parsedPayload.revision_date ? String(parsedPayload.revision_date) : null,
    category,
    fat_pct: fatPct,
    sugar_pct: sugarPct,
    total_solids_pct: totalSolidsPct,
    msnf_pct: msnfPct,
    solids_non_fat_pct: msnfPct,
    other_solids_pct: Math.max(
      totalSolidsPct - fatPct - sugarPct - msnfPct,
      0
    ),
    pac_value: Number(parsedPayload.pac_value ?? 0),
    pod_value: Number(parsedPayload.pod_value ?? 0),
    cost_per_kg: Number(parsedPayload.cost_per_kg ?? 0),
    average_market_cost: Number(
      parsedPayload.average_market_cost ?? parsedPayload.cost_per_kg ?? 0
    ),
    cost_per_container: Number(
      parsedPayload.cost_per_container ?? parsedPayload.average_market_cost ?? 0
    ),
    container_size_g: Number(parsedPayload.container_size_g ?? 1000),
    is_cold_process: parsedPayload.is_cold_process !== false,
    is_base_ingredient:
      category === "Base" || category === "Sugar" || category === "Dairy",
    is_dairy: parsedPayload.is_dairy === true,
    dosage_guideline: dosageGuideline,
    dosage_guideline_per_kg: dosageGuideline,
    pdf_url: publicUrlData.publicUrl,
    extraction_source:
      parsedPayload.extraction_source === "Nutritional Fallback"
        ? "Nutritional Fallback"
        : "Balancing Parameters",
    raw_ocr_dump: String(parsedPayload.raw_ocr_dump ?? ""),
    status: "verified",
  };

  if (publishToMaster) {
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Master publishing requires the Supabase service role key." },
        { status: 500 }
      );
    }
    try {
      const published = await publishMasterIngredientDirect(supabase, basePayload);
      return NextResponse.json({ item: published });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unable to publish ingredient." },
        { status: 500 }
      );
    }
  }

  let insert = await supabase
    .from("ingredients")
    .insert({
      ...basePayload,
      is_master: false,
      user_id: null,
    })
    .select("*")
    .single();

  if (insert.error && shouldRetryWithoutIsDairy(insert.error)) {
    const { is_dairy: _ignoredIsDairy, ...legacyPayload } = basePayload;
    insert = await supabase
      .from("ingredients")
      .insert({
        ...legacyPayload,
        is_master: false,
        user_id: null,
      })
      .select("*")
      .single();
  }

  if (insert.error) {
    return NextResponse.json({ error: insert.error.message }, { status: 500 });
  }

  return NextResponse.json({ item: insert.data });
}
