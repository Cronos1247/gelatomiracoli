import { redirect } from "next/navigation";
import { PortalLanguageToggle } from "@/components/portal/PortalLanguageToggle";
import { PortalSidebarNav } from "@/components/portal/PortalSidebarNav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="relative min-h-screen text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-4rem] right-[10%] h-80 w-80 rounded-full bg-emerald-500/8 blur-3xl" />
      </div>

      <aside className="bg-white/5 backdrop-blur-2xl border-r border-white/10 h-screen fixed left-0 top-0 z-40 w-64 px-6 py-8 shadow-2xl">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/40">
            Gelato Miracoli
          </p>
          <h1
            className="mt-4 text-3xl tracking-[0.04em] text-white"
            style={{ fontFamily: "var(--font-miracoli-serif)" }}
          >
            Command Center
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/50">
            Your premium shell for formulas, pantry intelligence, and hardware.
          </p>
        </div>

        <PortalSidebarNav />
      </aside>

      <main className="ml-64 min-h-screen">
        <div className="flex justify-end px-6 py-5 lg:px-10">
          <PortalLanguageToggle />
        </div>
        <div className="relative">{children}</div>
      </main>
    </div>
  );
}
