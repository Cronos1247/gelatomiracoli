import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type MobilePantryPayload = {
  name: string;
  name_en?: string | null;
  name_es?: string | null;
  name_it?: string | null;
  category?: string | null;
  fat_pct?: number | null;
  sugar_pct?: number | null;
  total_solids_pct?: number | null;
  pac_value?: number | null;
  pod_value?: number | null;
  dosage_guideline_per_kg?: number | null;
  dosage_guideline?: number | null;
  cost_per_container?: number | null;
  container_size_g?: number | null;
  average_market_cost?: number | null;
  status?: string | null;
};

function getSupabaseWriteClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || (!serviceRoleKey && !anonKey)) {
    return null;
  }

  return createClient(url, serviceRoleKey ?? anonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: Request) {
  const supabase = getSupabaseWriteClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured for mobile pantry sync." },
      { status: 500 }
    );
  }

  const payload = (await request.json()) as MobilePantryPayload;

  if (!payload.name?.trim()) {
    return NextResponse.json({ error: "Ingredient name is required." }, { status: 400 });
  }

  const record = {
    name: payload.name.trim(),
    name_en: payload.name_en ?? payload.name.trim(),
    name_es: payload.name_es ?? payload.name.trim(),
    name_it: payload.name_it ?? payload.name.trim(),
    category: payload.category ?? "Flavor Paste",
    fat_pct: payload.fat_pct ?? 0,
    sugar_pct: payload.sugar_pct ?? 0,
    total_solids_pct: payload.total_solids_pct ?? 0,
    pac_value: payload.pac_value ?? 0,
    pod_value: payload.pod_value ?? 0,
    dosage_guideline_per_kg:
      payload.dosage_guideline_per_kg ?? payload.dosage_guideline ?? 100,
    cost_per_container: payload.cost_per_container ?? 0,
    container_size_g: payload.container_size_g ?? 1000,
    average_market_cost: payload.average_market_cost ?? 0,
    is_master: false,
    is_base_ingredient: false,
    is_cold_process: true,
    user_id: null,
    status: payload.status ?? "draft",
  };

  const existing = await supabase
    .from("ingredients")
    .select("id")
    .eq("name", record.name)
    .is("user_id", null)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    return NextResponse.json({ error: existing.error.message }, { status: 500 });
  }

  if (existing.data?.id) {
    const update = await supabase
      .from("ingredients")
      .update(record)
      .eq("id", existing.data.id)
      .select("*")
      .single();

    if (update.error || !update.data) {
      return NextResponse.json(
        { error: update.error?.message ?? "Ingredient update failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ingredient: update.data, action: "updated" });
  }

  const insert = await supabase
    .from("ingredients")
    .insert(record)
    .select("*")
    .single();

  if (insert.error || !insert.data) {
    return NextResponse.json(
      { error: insert.error?.message ?? "Ingredient insert failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ingredient: insert.data, action: "inserted" });
}
