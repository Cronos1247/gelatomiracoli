import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defaultIngredients } from "@/lib/default-data";
import { PortalRecipeLab, type PortalLabIngredient } from "@/components/portal/lab/PortalRecipeLab";

function normalizeLabIngredient(record: Record<string, unknown>): PortalLabIngredient {
  return {
    id: String(record.id),
    name: String(record.name ?? "Ingredient"),
    category: String(record.category ?? "Other"),
    pac_value: Number(record.pac_value ?? 0),
    pod_value: Number(record.pod_value ?? 0),
    total_solids_pct: Number(record.total_solids_pct ?? 0),
  };
}

function getFallbackIngredients(): PortalLabIngredient[] {
  return defaultIngredients.slice(0, 18).map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    pac_value: ingredient.pac_value,
    pod_value: ingredient.pod_value,
    total_solids_pct: Number(ingredient.total_solids_pct ?? 0),
  }));
}

export const dynamic = "force-dynamic";

export default async function PortalLabPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return <PortalRecipeLab ingredients={getFallbackIngredients()} />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let supportsIsGlobal = true;
  const globalProbe = await supabase.from("ingredients").select("id, is_global").limit(1);

  if (globalProbe.error) {
    supportsIsGlobal = false;
  }

  let query = supabase
    .from("ingredients")
    .select("id, name, category, pac_value, pod_value, total_solids_pct, user_id, is_master")
    .order("category", { ascending: true })
    .order("name", { ascending: true })
    .limit(80);

  if (supportsIsGlobal) {
    query = user
      ? query.or(`user_id.eq.${user.id},is_global.eq.true`)
      : query.eq("is_global", true);
  } else {
    query = user
      ? query.or(`user_id.eq.${user.id},is_master.eq.true,user_id.is.null`)
      : query.or("is_master.eq.true,user_id.is.null");
  }

  const { data, error } = await query;

  if (error || !data?.length) {
    return <PortalRecipeLab ingredients={getFallbackIngredients()} />;
  }

  const ingredients = (data as Record<string, unknown>[]).map(normalizeLabIngredient);

  return <PortalRecipeLab ingredients={ingredients} />;
}
