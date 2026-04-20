import { redirect } from "next/navigation";
import { AuthSignupForm } from "@/components/auth/AuthSignupForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SignupPage() {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/portal/dashboard");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#0A0B14_0%,#000000_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,229,255,0.12),transparent_42%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.06),transparent_28%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="self-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Gelato Miracoli</p>
            <h1
              className="mt-5 text-5xl leading-none tracking-[-0.06em] text-white sm:text-6xl"
              style={{ fontFamily: "var(--font-miracoli-serif)" }}
            >
              Build your private command center for formulas, costs, and production.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/58">
              Create your Miracoli account to claim your pantry, seed your foundation library, and
              unlock the portal built for an executive pastry workflow.
            </p>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/[0.02] p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-[24px]">
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Create Account</p>
            <h2
              className="mt-4 text-3xl tracking-[-0.04em] text-white"
              style={{ fontFamily: "var(--font-miracoli-serif)" }}
            >
              Open the Lab
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/50">
              We&apos;ll set up your company shell, profile, and onboarding flow in one pass.
            </p>

            <div className="mt-8">
              <AuthSignupForm />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
