import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PortalDashboardOverview } from "@/components/portal/PortalDashboardOverview";

function normalizeCount(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export const dynamic = "force-dynamic";

export default async function PortalDashboardPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: ingredientCount }, { count: recipeCount }] = await Promise.all([
    supabase
      .from("ingredients")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user?.id ?? "__no_user__"),
    supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user?.id ?? "__no_user__"),
  ]);

  return (
    <PortalDashboardOverview
      ingredientCount={normalizeCount(ingredientCount)}
      recipeCount={normalizeCount(recipeCount)}
    />
  );
}
