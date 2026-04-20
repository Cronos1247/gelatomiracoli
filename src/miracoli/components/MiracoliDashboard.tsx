"use client";

import Link from "next/link";
import type { DisplayType } from "@/lib/default-data";

type MiracoliDashboardProps = {
  recipeCount: number;
  selectedEquipmentLabel: string;
  machineType: string;
  displayType: DisplayType;
  dataSource: string;
  recipeStartMode: "precision" | "inspiration";
  onRecipeStartModeChange: (mode: "precision" | "inspiration") => void;
};

export function MiracoliDashboard({
  recipeCount,
  selectedEquipmentLabel,
  machineType,
  displayType,
  dataSource,
  recipeStartMode,
  onRecipeStartModeChange,
}: MiracoliDashboardProps) {
  const actions = [
    {
      title: recipeStartMode === "precision" ? "Precision" : "Inspiration",
      body:
        recipeStartMode === "precision"
          ? "Load an exact PreGel or Mec3 spec and balance the base around verified PDF physics."
          : "Start from an archetype like 70% dark chocolate and let the pantry suggest cocoa and chocolate structure.",
      href: recipeStartMode === "precision" ? "/pantry" : "#lab",
      cta: recipeStartMode === "precision" ? "Load Exact Specs" : "Build From Archetype",
    },
    {
      title: "Pantry",
      body: "Upload technical PDFs, review extracted data, and keep the ingredient library current.",
      href: "/pantry",
      cta: "Open Pantry",
    },
    {
      title: "Recipe Book",
      body: "Return to saved snapshots, scale batches forward, and export branded production sheets.",
      href: "#recipe-book",
      cta: "View Archive",
    },
  ];

  return (
    <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <article className="luxury-card rounded-[30px] p-6 sm:p-7">
        <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
          Miracoli Dashboard
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Run the lab from one premium console
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
          Dial in new production work, sync the pantry, and keep recipe snapshots ready for the
          cafe or Amazon operation without leaving the Miracoli workspace.
        </p>

        <div className="miracoli-engine-glow mt-5 rounded-[26px] border border-[rgba(212,175,55,0.24)] bg-[linear-gradient(135deg,rgba(212,175,55,0.12),rgba(255,255,255,0.02))] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Lab Status
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                Engine calibrated and ready
              </h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {selectedEquipmentLabel} | {machineType} | {displayType}
              </p>
            </div>
            <Link
              href="#lab-setup"
              className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm transition hover:border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.08)]"
            >
              Recalibrate
            </Link>
          </div>
        </div>

        <div className="mt-5 rounded-[26px] border border-[var(--accent-border)] bg-black/10 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Recipe Start
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["precision", "inspiration"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onRecipeStartModeChange(mode)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  recipeStartMode === mode
                    ? "border-[rgba(212,175,55,0.34)] bg-[rgba(212,175,55,0.12)]"
                    : "border-[var(--accent-border)] bg-black/10"
                }`}
              >
                {mode === "precision" ? "Precision" : "Inspiration"}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {recipeStartMode === "precision"
              ? 'User intent: "I have PreGel 06872." Miracoli opens the pantry/PDF path and balances with exact parameters.'
              : 'User intent: "I want a 70% Dark Chocolate." Miracoli starts from a pantry-backed archetype and builds the recipe from scratch.'}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Recipes</p>
            <p className="metric-value mt-3 text-3xl font-semibold">{recipeCount}</p>
          </div>
          <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Engine</p>
            <p className="mt-3 text-base font-medium">{selectedEquipmentLabel}</p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">{machineType}</p>
          </div>
          <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Service Vessel
            </p>
            <p className="mt-3 text-base font-medium">{displayType}</p>
            <p className="mt-2 text-xs text-[var(--text-muted)] capitalize">{dataSource}</p>
          </div>
        </div>
      </article>

      <div className="grid gap-4 sm:grid-cols-3">
        {actions.map((action) => (
          <article key={action.title} className="luxury-card rounded-[28px] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Primary Action
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{action.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{action.body}</p>
            <Link
              href={action.href}
              className="mt-5 inline-flex rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm transition hover:border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.08)]"
            >
              {action.cta}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
