"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Printer, Search, Sparkles } from "lucide-react";

export type RecipeVaultCard = {
  id: string;
  name: string;
  archetype: string;
  type: "Gelato" | "Sorbet";
  pac: number;
  pod: number;
  costPerKg: number;
  items: Array<{
    ingredient_name: string;
    grams: number;
    percentage: number;
  }>;
};

type FilterKey = "All" | "Gelato" | "Sorbet";

const FILTERS: FilterKey[] = ["All", "Gelato", "Sorbet"];

function printRecipeCard(recipe: RecipeVaultCard) {
  if (typeof window === "undefined") {
    return;
  }

  const recipeRows = recipe.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#f5f7fa;">${item.ingredient_name}</td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#00E5FF;text-align:right;font-family:ui-monospace, SFMono-Regular, Menlo, monospace;">${item.grams.toFixed(1)} g</td>
        </tr>
      `
    )
    .join("");

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!printWindow) {
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${recipe.name} Production Sheet</title>
        <style>
          body {
            margin: 0;
            padding: 40px;
            background: #0A0B14;
            color: #ffffff;
            font-family: ui-sans-serif, system-ui, sans-serif;
          }
          h1, h2 { margin: 0 0 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          .pill {
            display: inline-block;
            padding: 8px 12px;
            border-radius: 999px;
            background: rgba(255,255,255,0.06);
            margin-right: 8px;
          }
        </style>
      </head>
      <body>
        <h1>${recipe.name}</h1>
        <p style="color:rgba(255,255,255,0.62);margin:0 0 20px;">${recipe.archetype} • ${recipe.type}</p>
        <div>
          <span class="pill">PAC ${recipe.pac.toFixed(0)}</span>
          <span class="pill">POD ${recipe.pod.toFixed(0)}</span>
          <span class="pill">Cost / kg $${recipe.costPerKg.toFixed(2)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align:left;padding-bottom:10px;color:rgba(255,255,255,0.55);">Ingredient</th>
              <th style="text-align:right;padding-bottom:10px;color:rgba(255,255,255,0.55);">Weight</th>
            </tr>
          </thead>
          <tbody>${recipeRows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function RecipeVaultGrid({ recipes }: { recipes: RecipeVaultCard[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("All");

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return recipes.filter((recipe) => {
      const matchesFilter = filter === "All" ? true : recipe.type === filter;
      const matchesSearch = query
        ? [recipe.name, recipe.archetype, recipe.type].join(" ").toLowerCase().includes(query)
        : true;
      return matchesFilter && matchesSearch;
    });
  }, [filter, recipes, search]);

  return (
    <main className="px-4 pb-8 pt-2 sm:px-6 lg:px-8">
      <section className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-4 text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/42">
            Finalized Formulas
          </p>
          <h1
            className="text-gradient-serif text-5xl tracking-[0.08em] text-white"
            style={{ fontFamily: "var(--font-miracoli-serif)" }}
          >
            MAESTRO VAULT
          </h1>
          <div className="glass mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-full px-5 py-4 sm:flex-row sm:justify-between">
            <div className="flex w-full items-center gap-3 rounded-full bg-white/5 px-4 py-3 backdrop-blur-md">
              <Search size={16} className="text-white/40" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search formulas, archetypes, notes..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
            </div>
            <div className="flex items-center gap-2">
              {FILTERS.map((option) => {
                const active = filter === option;
                return (
                  <motion.button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                      active
                        ? "border-cyan-400/20 bg-cyan-400/12 text-white"
                        : "border-white/10 bg-white/[0.03] text-white/58 hover:text-white"
                    }`}
                  >
                    {option}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {filteredRecipes.length ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredRecipes.map((recipe, index) => (
              <motion.article
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.04, ease: "easeOut" }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
              >
                <div className="flex min-h-72 flex-col justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/36">
                      {recipe.type}
                    </p>
                    <h2
                      className="mt-4 text-3xl text-white"
                      style={{ fontFamily: "var(--font-miracoli-serif)" }}
                    >
                      {recipe.name}
                    </h2>
                    <p className="mt-2 text-sm text-white/48">{recipe.archetype}</p>

                    <div className="mt-6 flex flex-wrap gap-2">
                      <div className="rounded-lg bg-black/40 px-3 py-1">
                        <span className="text-[11px] uppercase tracking-[0.16em] text-white/38">
                          PAC
                        </span>
                        <p className="font-mono text-sm text-white">{recipe.pac.toFixed(0)}</p>
                      </div>
                      <div className="rounded-lg bg-black/40 px-3 py-1">
                        <span className="text-[11px] uppercase tracking-[0.16em] text-white/38">
                          POD
                        </span>
                        <p className="font-mono text-sm text-white">{recipe.pod.toFixed(0)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <div className="flex items-center justify-between border-t border-white/8 pt-4">
                      <span className="text-sm text-white/48">Cost / kg</span>
                      <span className="font-mono text-lg font-bold text-[#00E5FF]">
                        ${recipe.costPerKg.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100">
                  <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/8 bg-black/50 p-3 backdrop-blur-xl">
                    <button
                      type="button"
                      onClick={() => printRecipeCard(recipe)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition hover:bg-white/[0.08]"
                    >
                      <Printer size={15} />
                      <span>Print Sheet</span>
                    </button>
                    <Link
                      href={`/portal/lab?recipe=${recipe.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/12 px-4 py-3 text-sm text-white transition hover:bg-cyan-400/18"
                    >
                      <Sparkles size={15} />
                      <span>Open in Lab</span>
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[52vh] flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.02] px-8 py-16 text-center shadow-2xl backdrop-blur-xl">
            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 p-5 shadow-[0_0_40px_rgba(0,229,255,0.16)]">
              <FlaskConical size={32} className="text-[#00E5FF]" />
            </div>
            <h2
              className="mt-6 text-4xl text-white"
              style={{ fontFamily: "var(--font-miracoli-serif)" }}
            >
              Your Vault is Empty
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/54">
              No finalized formulas are in your private collection yet. Build your first masterpiece in the lab and send it straight into the vault.
            </p>
            <Link
              href="/portal/lab"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/12 px-6 py-3 text-sm text-white transition hover:scale-[1.02] hover:bg-cyan-400/18 active:scale-95"
            >
              <Sparkles size={16} />
              <span>Start Formulating</span>
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
