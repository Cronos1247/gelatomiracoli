import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type IngredientRow = Record<string, unknown> & {
  id: string;
  name?: string | null;
  user_id?: string | null;
  is_global?: boolean | null;
  is_master?: boolean | null;
  is_verified?: boolean | null;
  cost_per_container?: number | null;
  container_size_g?: number | null;
};

function sanitizeIngredientInsertPayload(
  row: IngredientRow,
  userId: string,
  patch: Record<string, number>
) {
  const clone = { ...row } as Record<string, unknown>;

  delete clone.id;
  delete clone.created_at;
  delete clone.updated_at;

  return {
    ...clone,
    ...patch,
    user_id: userId,
    is_global: false,
    is_master: false,
    is_verified: row.is_verified === true,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ ingredientId: string }> }
) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured for portal ledger updates." },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { ingredientId } = await context.params;
  const payload = (await request.json()) as {
    cost_per_container?: number;
    container_size_g?: number;
  };

  const patch: Record<string, number> = {};

  if (typeof payload.cost_per_container === "number" && Number.isFinite(payload.cost_per_container)) {
    patch.cost_per_container = payload.cost_per_container;
  }

  if (typeof payload.container_size_g === "number" && Number.isFinite(payload.container_size_g)) {
    patch.container_size_g = payload.container_size_g;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid changes were provided." }, { status: 400 });
  }

  const sourceResult = await supabase
    .from("ingredients")
    .select("*")
    .eq("id", ingredientId)
    .maybeSingle<IngredientRow>();

  if (sourceResult.error) {
    return NextResponse.json({ error: sourceResult.error.message }, { status: 500 });
  }

  if (!sourceResult.data) {
    return NextResponse.json({ error: "Ingredient not found." }, { status: 404 });
  }

  const source = sourceResult.data;
  const isOwnedPrivate = source.user_id === user.id && source.is_global !== true;

  if (isOwnedPrivate) {
    const updateResult = await supabase
      .from("ingredients")
      .update(patch)
      .eq("id", ingredientId)
      .eq("user_id", user.id)
      .select("id, cost_per_container, container_size_g, user_id, is_global, is_verified")
      .maybeSingle();

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ item: updateResult.data });
  }

  if (source.is_global === true || source.is_master === true) {
    const existingOverride = await supabase
      .from("ingredients")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", String(source.name ?? ""))
      .eq("is_global", false)
      .limit(1)
      .maybeSingle();

    if (existingOverride.error) {
      return NextResponse.json({ error: existingOverride.error.message }, { status: 500 });
    }

    if (existingOverride.data?.id) {
      const updateOverride = await supabase
        .from("ingredients")
        .update(patch)
        .eq("id", existingOverride.data.id)
        .eq("user_id", user.id)
        .select("id, cost_per_container, container_size_g, user_id, is_global, is_verified")
        .maybeSingle();

      if (updateOverride.error) {
        return NextResponse.json({ error: updateOverride.error.message }, { status: 500 });
      }

      return NextResponse.json({ item: updateOverride.data });
    }

    const insertPayload = sanitizeIngredientInsertPayload(source, user.id, patch);

    const insertResult = await supabase
      .from("ingredients")
      .insert(insertPayload)
      .select("id, cost_per_container, container_size_g, user_id, is_global, is_verified")
      .single();

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ item: insertResult.data });
  }

  return NextResponse.json(
    { error: "Only your own ledger rows can be edited from this screen." },
    { status: 403 }
  );
}
