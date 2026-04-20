"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function PortalDashboardOverview({
  ingredientCount,
  recipeCount,
}: {
  ingredientCount: number;
  recipeCount: number;
}) {
  return (
    <section className="px-6 pb-10 pt-4 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="space-y-4 text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
            Overview
          </p>
          <h1
            className="text-gradient-serif text-5xl tracking-[0.1em] text-white"
            style={{ fontFamily: "var(--font-miracoli-serif)" }}
          >
            MAESTRO DASHBOARD
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-white/56">
            Your private command surface for pantry economics, finalized formulas, and rapid
            ingestion.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
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
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/portal/pantry"
                  className="block rounded-[1.6rem] px-2 py-3 transition-all duration-300"
                >
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/38">
                    Ingredients
                  </p>
                  <p className="text-glow-cyan mt-4 font-mono text-5xl font-bold tracking-tight text-[#00E5FF] drop-shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                    {ingredientCount}
                  </p>
                  <p className="mt-3 text-sm text-white/52">
                    Chemistry and pricing records inside your ledger.
                  </p>
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/portal/library"
                  className="block rounded-[1.6rem] px-2 py-3 transition-all duration-300"
                >
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/38">
                    Recipe Vault
                  </p>
                  <p className="text-glow-cyan mt-4 font-mono text-5xl font-bold tracking-tight text-[#00E5FF] drop-shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                    {recipeCount}
                  </p>
                  <p className="mt-3 text-sm text-white/52">
                    Finalized formulas ready for production and export.
                  </p>
                </Link>
              </motion.div>
            </div>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: "easeOut" }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Link
              href="/portal/ingest"
              className="relative block overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 backdrop-blur-2xl transition-all duration-500 ease-out hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.04] hover:shadow-[0_16px_48px_0_rgba(0,229,255,0.1)] active:scale-[0.99]"
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
          </motion.div>
        </div>
      </div>
    </section>
  );
}
