"use client";

import { ToggleChip } from "@/components/GelatoPrimitives";
import type { DisplayType, Equipment } from "@/lib/default-data";

type QuickStartItem = {
  label: string;
  ingredientName: string;
  description: string;
  inStock: boolean;
};

type LabOnboardingSetupProps = {
  equipment: Equipment[];
  selectedEquipmentId: string;
  displayType: DisplayType;
  quickStartItems: QuickStartItem[];
  saveState: "idle" | "saving" | "saved" | "error";
  onSelectBrand: (brand: string) => void;
  onSelectEquipment: (equipmentId: string) => void;
  onSelectDisplayType: (displayType: DisplayType) => void;
  onToggleQuickStart: (ingredientName: string) => void;
  onSave: () => void;
};

export function LabOnboardingSetup({
  equipment,
  selectedEquipmentId,
  displayType,
  quickStartItems,
  saveState,
  onSelectBrand,
  onSelectEquipment,
  onSelectDisplayType,
  onToggleQuickStart,
  onSave,
}: LabOnboardingSetupProps) {
  const selectedEquipment =
    equipment.find((item) => item.id === selectedEquipmentId) ?? equipment[0];
  const brands = Array.from(new Set(equipment.map((item) => item.brand)));
  const brandEquipment = equipment.filter((item) => item.brand === selectedEquipment.brand);

  return (
    <section id="lab-setup" className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <article className="luxury-card rounded-[30px] p-6 sm:p-7">
        <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
          Onboarding
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Set up the laboratory
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
          Register the production engine, define the display environment, and save the PAC posture
          you want the solver to respect globally.
        </p>

        <div className="mt-6">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Step 1. Hardware Registry
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {brands.map((brand) => {
              const active = selectedEquipment.brand === brand;

              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => onSelectBrand(brand)}
                  className={`rounded-[24px] border p-4 text-left transition ${
                    active
                      ? "border-[rgba(212,175,55,0.32)] bg-[rgba(212,175,55,0.1)]"
                      : "border-[var(--accent-border)] bg-black/10 hover:border-[rgba(212,175,55,0.22)]"
                  }`}
                >
                  <p className="miracoli-serif text-2xl tracking-[-0.04em]">{brand}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {equipment.filter((item) => item.brand === brand).length} model
                    {equipment.filter((item) => item.brand === brand).length > 1 ? "s" : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Active Model
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {brandEquipment.map((item) => {
              const active = item.id === selectedEquipmentId;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectEquipment(item.id)}
                  className={`rounded-[24px] border p-4 text-left transition ${
                    active
                      ? "border-[rgba(212,175,55,0.32)] bg-[rgba(212,175,55,0.1)]"
                      : "border-[var(--accent-border)] bg-black/10 hover:border-[rgba(212,175,55,0.22)]"
                  }`}
                >
                  <p className="text-lg font-medium">{item.model}</p>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    {item.machine_type} | {item.default_overrun_pct}% default overrun
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {item.heating_capability ? "Heating enabled" : "Cold process only"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Step 2. Service Vessel
          </p>
          <div className="flex flex-wrap gap-2">
          {(["Standard Case", "Pozzetti"] as const).map((option) => (
            <ToggleChip
              key={option}
              selected={displayType === option}
              label={option}
              onClick={() => onSelectDisplayType(option)}
            />
          ))}
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4 text-sm text-[var(--text-muted)]">
          {selectedEquipment.brand} {selectedEquipment.model} maps to a{" "}
          {selectedEquipment.machine_type} cooling profile with {selectedEquipment.default_overrun_pct}
          % default overrun. {selectedEquipment.heating_capability
            ? "Heating is available for pasteurization workflows."
            : "Heating is unavailable, so the lab will steer you toward cold-process ingredients."}
          {displayType === "Pozzetti"
            ? " Pozzetti service locks the global PAC window to 210-230."
            : " Standard display keeps the global PAC window at 240-260."}
        </div>
      </article>

      <article className="luxury-card rounded-[30px] p-6 sm:p-7">
        <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
          Pantry Sync
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Quick-start ingredient checklist
        </h2>
        <div className="mt-5 grid gap-3">
          {quickStartItems.map((item) => (
            <button
              key={item.ingredientName}
              type="button"
              onClick={() => onToggleQuickStart(item.ingredientName)}
              className={`rounded-[22px] border p-4 text-left transition ${
                item.inStock
                  ? "border-[rgba(212,175,55,0.28)] bg-[rgba(212,175,55,0.08)]"
                  : "border-[var(--accent-border)] bg-black/10"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{item.description}</p>
                </div>
                <span className="gold-chip rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
                  {item.inStock ? "In Stock" : "Out"}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
          <p className="text-sm text-[var(--text-muted)]">
            Save the engine and display registry to your profile so every new recipe opens with the
            right PAC window.
          </p>
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b1612] transition hover:brightness-105"
          >
            {saveState === "saving"
              ? "Saving Setup"
              : saveState === "saved"
                ? "Saved To Profile"
                : "Save Lab Setup"}
          </button>
        </div>
      </article>
    </section>
  );
}
