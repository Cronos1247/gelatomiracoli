import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PortalOnboardingPage() {
  const supabase = await createSupabaseServerClient();
  let profileName = "Maestro";
  let companyName = "your gelateria";

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const profileResult = await supabase
        .from("profiles")
        .select("primary_contact_name, company_id")
        .eq("id", user.id)
        .maybeSingle();

      const row = profileResult.data as
        | { primary_contact_name?: string | null; company_id?: string | null }
        | null;

      profileName = row?.primary_contact_name?.trim() || profileName;

      if (row?.company_id) {
        const companyResult = await supabase
          .from("companies")
          .select("name")
          .eq("id", row.company_id)
          .maybeSingle();

        companyName = companyResult.data?.name?.trim() || companyName;
      }
    }
  }

  return (
    <div className="space-y-8 px-8 py-10 lg:px-12">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_45px_rgba(0,0,0,0.28)] backdrop-blur-[24px]">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#D4AF37]">Welcome to the Lab</p>
        <h1
          className="mt-4 text-4xl tracking-[-0.05em] text-white"
          style={{ fontFamily: "var(--font-miracoli-serif)" }}
        >
          Buon Giorno, {profileName}.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-white/62">
          {companyName} is now provisioned inside the Command Center. Your next steps are to claim
          any orphaned development data, review the Master Ledger, and begin ingesting live
          technical sheets into your private vault.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-black/25 p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Foundation</p>
            <p className="mt-3 text-lg font-medium text-white">Global pantry + fruit library ready</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/25 p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Next Stop</p>
            <p className="mt-3 text-lg font-medium text-white">Master Ledger for chemistry + cost</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/25 p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Production</p>
            <p className="mt-3 text-lg font-medium text-white">Recipe Library and PDF workflow</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-[20px]">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">Claim Existing Data</p>
          <h2
            className="mt-4 text-2xl tracking-[-0.04em] text-white"
            style={{ fontFamily: "var(--font-miracoli-serif)" }}
          >
            One final SQL pass
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/56">
            If you already uploaded PDFs during development, run this once in the Supabase SQL
            Editor after signup so those ingredients and display cases become yours.
          </p>

          <pre className="mt-6 overflow-x-auto rounded-[24px] border border-white/10 bg-black/35 p-5 text-xs leading-7 text-[#D2F9FF]">
            <code>{`-- Replace with your new auth user UUID
UPDATE ingredients
SET user_id = 'YOUR_NEW_UUID_HERE'
WHERE user_id IS NULL;

UPDATE display_cases
SET user_id = 'YOUR_NEW_UUID_HERE'
WHERE user_id IS NULL;`}</code>
          </pre>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-[20px]">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">Where To Next</p>
          <div className="mt-6 space-y-4">
            <Link
              href="/portal/dashboard"
              className="block rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 text-white transition hover:border-[#00E5FF]/30 hover:bg-[#00E5FF]/[0.08]"
            >
              Enter the Maestro Dashboard
            </Link>
            <Link
              href="/portal/pantry"
              className="block rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 text-white transition hover:border-[#00E5FF]/30 hover:bg-[#00E5FF]/[0.08]"
            >
              Open the Master Ledger
            </Link>
            <Link
              href="/portal/ingestion"
              className="block rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 text-white transition hover:border-[#00E5FF]/30 hover:bg-[#00E5FF]/[0.08]"
            >
              Ingest your next technical sheet
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
