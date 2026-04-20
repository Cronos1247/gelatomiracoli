import { redirect } from "next/navigation";
import { AuthLoginForm } from "@/components/auth/AuthLoginForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createSupabaseServerClient();
  const { status } = await searchParams;

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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,229,255,0.12),transparent_40%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="self-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
              Gelato Miracoli
            </p>
            <h1
              className="mt-5 text-5xl leading-none tracking-[-0.06em] text-white sm:text-6xl"
              style={{ fontFamily: "var(--font-miracoli-serif)" }}
            >
              A Luxury Command Center for Precision Gelato.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/58">
              Step into the portal where chemistry, pricing, uploads, and production formulas live
              in one polished glass cockpit.
            </p>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-8 shadow-[0_0_70px_rgba(0,0,0,0.35)] backdrop-blur-[20px]">
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">
              Portal Access
            </p>
            <h2
              className="mt-4 text-3xl tracking-[-0.04em] text-white"
              style={{ fontFamily: "var(--font-miracoli-serif)" }}
            >
              Welcome Back, Maestro
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/50">
              Log in to open the Command Center and continue balancing, pricing, and publishing.
            </p>

            {status === "check-email" ? (
              <div className="mt-6 rounded-2xl border border-[#00E5FF]/20 bg-[#00E5FF]/10 px-4 py-3 text-sm text-[#C8FBFF]">
                Your account has been created. Confirm your email, then log in to continue.
              </div>
            ) : null}

            <div className="mt-8">
              <AuthLoginForm />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
