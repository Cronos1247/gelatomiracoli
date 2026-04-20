export default function PortalSettingsPage() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Hardware</p>
          <h1
            className="mt-4 text-4xl tracking-[-0.05em] text-white"
            style={{ fontFamily: "var(--font-miracoli-serif)" }}
          >
            Settings
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/55">
            Equipment limits, display case preferences, and profile controls will live here as the
            portal shell matures.
          </p>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Profile</p>
          <h2
            className="mt-4 text-3xl tracking-[-0.04em] text-white"
            style={{ fontFamily: "var(--font-miracoli-serif)" }}
          >
            Artisan Preferences
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/55">
            This area is reserved for profile branding, equipment defaults, and future account
            controls.
          </p>
        </div>
      </section>
    </main>
  );
}
