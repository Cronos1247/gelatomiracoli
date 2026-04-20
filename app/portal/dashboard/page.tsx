import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    <section className="px-6 pb-10 pt-4 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="space-y-4 text-center">
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
            Overview
          </p>
          <h1
            className="text-5xl tracking-[0.08em] text-white"
            style={{ fontFamily: "var(--font-miracoli-serif)" }}
          >
            MAESTRO DASHBOARD
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-white/56">
            Your private command surface for pantry economics, finalized formulas, and rapid ingestion.
          </p>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 backdrop-blur-2xl transition-all duration-500 ease-out hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.04] hover:shadow-[0_16px_48px_0_rgba(0,229,255,0.1)]"
            style={{
              boxShadow:
                "inset 0 1px 1px rgba(255,255,255,0.15), 0 8px 32px 0 rgba(0,0,0,0.4)",
            }}
          >
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/38">
              Private Pantry
            </p>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <Link
                href="/portal/pantry"
                className="rounded-[1.6rem] px-2 py-3 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/38">
                  Ingredients
                </p>
                <p className="mt-4 font-mono text-5xl font-bold tracking-tight text-[#00E5FF] drop-shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                  {normalizeCount(ingredientCount)}
                </p>
                <p className="mt-3 text-sm text-white/52">
                  Chemistry and pricing records inside your ledger.
                </p>
              </Link>

              <Link
                href="/portal/library"
                className="rounded-[1.6rem] px-2 py-3 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/38">
                  Recipe Vault
                </p>
                <p className="mt-4 font-mono text-5xl font-bold tracking-tight text-[#00E5FF] drop-shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                  {normalizeCount(recipeCount)}
                </p>
                <p className="mt-3 text-sm text-white/52">
                  Finalized formulas ready for production and export.
                </p>
              </Link>
            </div>
          </section>

          <Link
            href="/portal/ingest"
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 backdrop-blur-2xl transition-all duration-500 ease-out hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.04] hover:shadow-[0_16px_48px_0_rgba(0,229,255,0.1)] active:scale-[0.99]"
            style={{
              boxShadow:
                "inset 0 1px 1px rgba(255,255,255,0.15), 0 8px 32px 0 rgba(0,0,0,0.4)",
            }}
          >
            <p className="text-center text-[11px] uppercase tracking-[0.28em] text-cyan-200/72">
              Quick Action
            </p>
            <h2
              className="mt-4 text-center text-3xl text-white"
              style={{ fontFamily: "var(--font-miracoli-serif)" }}
            >
              Ingest New Technical Sheet
            </h2>
            <p className="mt-4 text-center text-sm leading-7 text-white/58">
              Drop a fresh PDF into the vault and push new chemistry into your working pantry.
            </p>
            <div className="mt-8 flex min-h-52 items-center justify-center rounded-2xl border-2 border-dashed border-[#00E5FF]/30 bg-[#00E5FF]/[0.02] px-6 py-8 text-center text-sm font-semibold tracking-[0.16em] text-[#E7FCFF] transition-colors duration-300 hover:border-[#00E5FF]/60 hover:bg-[#00E5FF]/10 animate-[pulse_3s_ease-in-out_infinite]">
              + OPEN INGESTION VAULT
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
