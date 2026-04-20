"use client";

import { useMemo, useState } from "react";
import type { Ingredient } from "@/lib/default-data";
import { derivePacPod, type ParsedIngredientPdf } from "@/lib/process-ingredient-pdf";

export type IngredientReviewValue = ParsedIngredientPdf["extracted"];

type IngredientReviewModalProps = {
  open: boolean;
  value: IngredientReviewValue;
  rawText: string;
  isMasterAdmin: boolean;
  onChange: (value: IngredientReviewValue) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  errorMessage: string | null;
};

type EditableField = keyof IngredientReviewValue;

const fieldMeta: Array<{
  key: EditableField;
  label: string;
  numeric?: boolean;
}> = [
  { key: "name", label: "Ingredient Name" },
  { key: "brand_name", label: "Brand" },
  { key: "product_code", label: "Product Code" },
  { key: "upc", label: "UPC" },
  { key: "category", label: "Category" },
  { key: "fat_pct", label: "Fat %", numeric: true },
  { key: "sugar_pct", label: "Sugar %", numeric: true },
  { key: "total_solids_pct", label: "Total Solids %", numeric: true },
  { key: "msnf_pct", label: "MSNF %", numeric: true },
  { key: "protein_g", label: "Protein g / 100g", numeric: true },
  { key: "kcal_per_100g", label: "Kcal / 100g", numeric: true },
  { key: "pac_value", label: "PAC", numeric: true },
  { key: "pod_value", label: "POD", numeric: true },
  { key: "dosage_guideline", label: "Dosage g / kg", numeric: true },
  { key: "cost_per_kg", label: "Market Cost / Kg", numeric: true },
  { key: "extraction_source", label: "Extraction Source" },
  { key: "is_cold_process", label: "Process Mode" },
];

export function IngredientReviewModal({
  open,
  value,
  rawText,
  isMasterAdmin,
  onChange,
  onClose,
  onSave,
  saving,
  errorMessage,
}: IngredientReviewModalProps) {
  const [editingField, setEditingField] = useState<EditableField | null>(null);

  const computedNotes = useMemo(() => {
    const residualOtherSolids = Math.max(
      value.total_solids_pct - value.fat_pct - value.sugar_pct - value.msnf_pct,
      0
    );

    return {
      isBaseIngredient:
        value.category === "Base" || value.category === "Sugar" || value.category === "Dairy",
      residualOtherSolids,
      calculatedPacPod: derivePacPod({
        sugarPct: value.sugar_pct,
        proteinG: value.msnf_pct,
      }),
      canCommit: value.pac_value > 0 && value.pod_value > 0,
    };
  }, [value]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md">
      <div className="luxury-card max-h-[90vh] w-full max-w-6xl overflow-auto rounded-[30px] p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
              PDF Audit
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              Review and commit ingredient data
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Source PDF Text
              </p>
              <span className="gold-chip rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
                Audit Pane
              </span>
            </div>
            <pre className="mt-4 max-h-[58vh] overflow-auto whitespace-pre-wrap rounded-[18px] border border-[var(--accent-border)] bg-[rgba(255,255,255,0.02)] p-4 text-xs leading-6 text-[var(--text-muted)]">
              {rawText}
            </pre>
          </div>

          <div className="space-y-3">
            {fieldMeta.map((field) => {
              const rawValue = value[field.key];
              const displayValue = rawValue ?? "Not found";
              const isEditing = editingField === field.key;

              return (
                <div
                  key={field.key}
                  className="rounded-[22px] border border-[var(--accent-border)] bg-black/10 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        {field.label}
                      </p>
                      {isEditing ? (
                        field.key === "category" ? (
                          <select
                            value={String(rawValue)}
                            onChange={(event) =>
                              onChange({
                                ...value,
                                category: event.target.value as Ingredient["category"],
                              })
                            }
                            className="mt-3 w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
                          >
                            {[
                              "Dairy",
                              "Sugar",
                              "Base/Stabilizer",
                              "Flavor Paste",
                              "Base",
                              "Nut",
                              "Chocolate",
                              "Other",
                            ].map((category) => (
                              <option key={category} value={category} className="bg-[#1a1614]">
                                {category}
                              </option>
                            ))}
                          </select>
                        ) : field.key === "extraction_source" ? (
                          <select
                            value={String(rawValue)}
                            onChange={(event) =>
                              onChange({
                                ...value,
                                extraction_source:
                                  event.target.value as IngredientReviewValue["extraction_source"],
                              })
                            }
                            className="mt-3 w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
                          >
                            {["Balancing Parameters", "Nutritional Fallback"].map((option) => (
                              <option key={option} value={option} className="bg-[#1a1614]">
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : field.key === "is_cold_process" ? (
                          <select
                            value={value.is_cold_process ? "Cold" : "Hot"}
                            onChange={(event) =>
                              onChange({
                                ...value,
                                is_cold_process: event.target.value === "Cold",
                              })
                            }
                            className="mt-3 w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
                          >
                            {["Cold", "Hot"].map((option) => (
                              <option key={option} value={option} className="bg-[#1a1614]">
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.numeric ? "number" : "text"}
                            step={field.numeric ? "0.1" : undefined}
                            value={field.numeric ? Number(rawValue ?? 0) : String(rawValue ?? "")}
                            onChange={(event) => {
                              const nextValue = field.numeric
                                ? Number(event.target.value) || 0
                                : event.target.value;
                              const nextState = {
                                ...value,
                                [field.key]: nextValue,
                              };

                              if (
                                field.key === "sugar_pct" ||
                                field.key === "protein_g" ||
                                field.key === "msnf_pct"
                              ) {
                                const normalizedProtein =
                                  field.key === "sugar_pct"
                                    ? nextState.msnf_pct
                                    : Number(nextValue);
                                const recalculated = derivePacPod({
                                  sugarPct:
                                    field.key === "sugar_pct"
                                      ? Number(nextValue)
                                      : nextState.sugar_pct,
                                  proteinG: normalizedProtein,
                                });

                                onChange({
                                  ...nextState,
                                  protein_g: normalizedProtein,
                                  msnf_pct: normalizedProtein,
                                  pac_value: recalculated.pac_value,
                                  pod_value: recalculated.pod_value,
                                });
                                return;
                              }

                              onChange(nextState);
                            }}
                            className="mt-3 w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
                          />
                        )
                      ) : (
                        <p className="mt-3 text-lg font-medium text-[var(--accent)]">
                          {field.key === "is_cold_process"
                            ? value.is_cold_process
                              ? "Cold"
                              : "Hot"
                            : String(displayValue)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingField((current) => (current === field.key ? null : field.key))
                      }
                      className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-xs uppercase tracking-[0.18em]"
                    >
                      {isEditing ? "Done" : "Edit"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[22px] border border-[var(--accent-border)] bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Derived Other Solids
            </p>
            <p className="mt-3 text-lg font-medium text-[var(--accent)]">
              {computedNotes.residualOtherSolids.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-[22px] border border-[var(--accent-border)] bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Base Ingredient Flag
            </p>
            <p className="mt-3 text-lg font-medium text-[var(--accent)]">
              {computedNotes.isBaseIngredient ? "True" : "False"}
            </p>
          </div>
          <div className="rounded-[22px] border border-[var(--accent-border)] bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Calculated PAC / POD
            </p>
            <p className="mt-3 text-lg font-medium text-[var(--accent)]">
              {computedNotes.calculatedPacPod.pac_value.toFixed(2)} /{" "}
              {computedNotes.calculatedPacPod.pod_value.toFixed(2)}
            </p>
          </div>
          <div className="rounded-[22px] border border-[var(--accent-border)] bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Commit Status
            </p>
            <p className="mt-3 text-lg font-medium text-[var(--accent)]">
              {computedNotes.canCommit ? "Ready to commit" : "PAC / POD required"}
            </p>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-[rgba(255,140,111,0.28)] bg-[rgba(255,140,111,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !computedNotes.canCommit}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b1612] disabled:opacity-70"
          >
            {saving
              ? "Saving..."
              : isMasterAdmin
                ? "Publish To Master"
                : "Save To Private"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--accent-border)] px-5 py-3 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
