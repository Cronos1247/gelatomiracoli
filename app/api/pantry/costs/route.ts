import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
      { error: "Supabase is not configured for pantry pricing." },
      { status: 500 }
    );
  }

  const payload = (await request.json()) as {
    ingredientId?: string;
    costPerKg?: number | null;
    currency?: string;
  };

  if (!payload.ingredientId) {
    return NextResponse.json({ error: "Ingredient is required." }, { status: 400 });
  }

  const userId = null;
  const existing = await supabase
    .from("user_ingredient_costs")
    .select("id")
    .eq("ingredient_id", payload.ingredientId)
    .is("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    return NextResponse.json({ error: existing.error.message }, { status: 500 });
  }

  if (payload.costPerKg === null || payload.costPerKg === undefined) {
    if (existing.data?.id) {
      const deletion = await supabase.from("user_ingredient_costs").delete().eq("id", existing.data.id);

      if (deletion.error) {
        return NextResponse.json({ error: deletion.error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ deleted: true });
  }

  const record = {
    user_id: userId,
    ingredient_id: payload.ingredientId,
    cost_per_kg: Number(payload.costPerKg),
    currency: payload.currency === "EUR" ? "EUR" : "USD",
  };

  const result = existing.data?.id
    ? await supabase
        .from("user_ingredient_costs")
        .update(record)
        .eq("id", existing.data.id)
        .select("*")
        .single()
    : await supabase.from("user_ingredient_costs").insert(record).select("*").single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ item: result.data });
}
