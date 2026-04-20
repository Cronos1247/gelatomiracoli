import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  proxySugarModels,
  type Ingredient,
  type ProxySugarModel,
} from "@/lib/default-data";
import { ToggleChip } from "@/components/GelatoPrimitives";
import { CameraScanner } from "@/src/miracoli/components";
import { searchPantry, type SearchPantryResult } from "@/lib/search-pantry";
import { fetchIngredientSpecs } from "@/lib/fetch-ingredient-specs";

export type CustomIngredientFormState = {
  name: string;
  category: Ingredient["category"];
  costPerKg: number;
  gramsPerKgMix: number;
  mode: "full" | "proxy";
  isColdProcess: boolean;
  fatPct: number;
  sugarPct: number;
  solidsNonFatPct: number;
  otherSolidsPct: number;
  pacValue: number;
  podValue: number;
  proxyFat: number;
  proxySugars: number;
  proxyProtein: number;
  proxySugarModel: ProxySugarModel;
};

type CustomIngredientModalProps = {
  open: boolean;
  form: CustomIngredientFormState;
  setForm: Dispatch<SetStateAction<CustomIngredientFormState>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export const defaultCustomIngredientForm: CustomIngredientFormState = {
  name: "",
  category: "Nut",
  costPerKg: 18,
  gramsPerKgMix: 40,
  mode: "proxy",
  isColdProcess: true,
  fatPct: 0,
  sugarPct: 0,
  solidsNonFatPct: 0,
  otherSolidsPct: 0,
  pacValue: 0,
  podValue: 0,
  proxyFat: 12,
  proxySugars: 18,
  proxyProtein: 5,
  proxySugarModel: "Sucrose",
};

export function makeIngredientFromForm(state: CustomIngredientFormState): Ingredient {
  if (state.mode === "full") {
    return {
      id: `${state.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      name: state.name,
      category: state.category,
      fat_pct: state.fatPct,
      sugar_pct: state.sugarPct,
      total_solids_pct:
        state.fatPct + state.sugarPct + state.solidsNonFatPct + state.otherSolidsPct,
      solids_non_fat_pct: state.solidsNonFatPct,
      other_solids_pct: state.otherSolidsPct,
      pac_value: state.pacValue,
      pod_value: state.podValue,
      cost_per_kg: state.costPerKg,
      is_cold_process: state.isColdProcess,
      is_base_ingredient: state.category === "Base" || state.category === "Sugar",
      is_master: false,
      dosage_guideline: null,
      pdf_url: null,
      user_id: null,
      data_priority: "verified_lab_data",
    };
  }

  const sugarModel = proxySugarModels[state.proxySugarModel];

  return {
    id: `${state.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
    name: state.name,
    category: state.category,
    fat_pct: state.proxyFat,
    sugar_pct: state.proxySugars,
    total_solids_pct: state.proxyFat + state.proxySugars + state.proxyProtein,
    solids_non_fat_pct: state.proxyProtein,
    other_solids_pct: 0,
    pac_value: state.proxySugars * sugarModel.pacCoefficient,
    pod_value: state.proxySugars * sugarModel.podCoefficient,
    cost_per_kg: state.costPerKg,
    is_cold_process: true,
    is_base_ingredient: state.category === "Base" || state.category === "Sugar",
    is_master: false,
    dosage_guideline: null,
    pdf_url: null,
    user_id: null,
    data_priority: "proxy_mode",
  };
}

export function CustomIngredientModal({
  open,
  form,
  setForm,
  onClose,
  onSubmit,
}: CustomIngredientModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [fetchingSpecs, setFetchingSpecs] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchPantryResult[]>([]);

  if (!open) {
    return null;
  }

  const applyProxyScan = (scan: {
    fat: number;
    sugars: number;
    protein: number;
  }) => {
    setForm((current) => ({
      ...current,
      mode: "proxy",
      proxyFat: scan.fat,
      proxySugars: scan.sugars,
      proxyProtein: scan.protein,
    }));
  };

  const applyParsedSearchResult = (result: SearchPantryResult) => {
    if (!result.parsed) {
      return;
    }

    const extracted = result.parsed.extracted;
    const solidsNonFat = extracted.msnf_pct || extracted.protein_g || 0;
    const otherSolids = Math.max(
      (extracted.total_solids_pct ?? 0) - extracted.fat_pct - extracted.sugar_pct - solidsNonFat,
      0
    );

    setForm((current) => ({
      ...current,
      mode: "full",
      name: extracted.name || current.name,
      category: extracted.category,
      gramsPerKgMix: extracted.dosage_guideline ?? current.gramsPerKgMix,
      isColdProcess: extracted.is_cold_process,
      fatPct: extracted.fat_pct,
      sugarPct: extracted.sugar_pct,
      solidsNonFatPct: solidsNonFat,
      otherSolidsPct: otherSolids,
      pacValue: extracted.pac_value,
      podValue: extracted.pod_value,
    }));
  };

  const handleSearchTechSheets = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const results = await searchPantry(searchQuery.trim());
      setSearchResults(results);
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Unable to search for technical sheets."
      );
    } finally {
      setSearching(false);
    }
  };

  const handleFetchSpecs = async () => {
    if (!form.name.trim()) {
      setSearchError("Enter a product name first so Miracoli knows what to fetch.");
      return;
    }

    setFetchingSpecs(true);
    setSearchError(null);

    try {
      const result = await fetchIngredientSpecs(form.name.trim());

      setForm((current) => ({
        ...current,
        mode: "full",
        category: result.extracted.category,
        fatPct: result.extracted.fat_pct,
        sugarPct: result.extracted.sugar_pct,
        solidsNonFatPct: result.extracted.solids_non_fat_pct,
        otherSolidsPct: result.extracted.other_solids_pct,
        pacValue: result.extracted.pac_value,
        podValue: result.extracted.pod_value,
        gramsPerKgMix: result.extracted.dosage_guideline ?? current.gramsPerKgMix,
        isColdProcess: result.extracted.is_cold_process,
      }));

      setSearchError(result.disclaimer ?? null);
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Unable to fetch estimated specs."
      );
    } finally {
      setFetchingSpecs(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md">
      <form
        onSubmit={onSubmit}
        className="luxury-card max-h-[90vh] w-full max-w-3xl overflow-auto rounded-[30px] p-6"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
              Proxy Mode
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              Add Custom Ingredient
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Ingredient Name
            </span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Category
            </span>
            <select
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value as Ingredient["category"],
                }))
              }
              className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
            >
              {["Base", "Sugar", "Nut", "Chocolate"].map((category) => (
                <option key={category} value={category} className="bg-[#1a1614]">
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Cost / Kg
            </span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={form.costPerKg}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  costPerKg: Number(event.target.value) || 0,
                }))
              }
              className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Grams Per Kg Mix
            </span>
            <input
              type="number"
              min={0}
              step={5}
              value={form.gramsPerKgMix}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  gramsPerKgMix: Number(event.target.value) || 0,
                }))
              }
              className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <ToggleChip
            selected={form.mode === "proxy"}
            label="Proxy Mode"
            onClick={() => setForm((current) => ({ ...current, mode: "proxy" }))}
          />
          <ToggleChip
            selected={form.mode === "full"}
            label="Full Specs"
            onClick={() => setForm((current) => ({ ...current, mode: "full" }))}
          />
        </div>

        {form.mode === "proxy" ? (
          <div className="mt-5 space-y-5">
            <CameraScanner
              onDetected={(scan) =>
                applyProxyScan({
                  fat: scan.fat,
                  sugars: scan.sugars,
                  protein: scan.protein,
                })
              }
            />

            <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Search Technical Sheet
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="French Vanilla Mec3"
                  className="min-w-[240px] flex-1 rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
                />
                <button
                  type="button"
                  onClick={() => void handleSearchTechSheets()}
                  className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm"
                >
                  {searching ? "Searching..." : "Search PDFs"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleFetchSpecs()}
                  className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm"
                >
                  {fetchingSpecs ? "Fetching..." : "Fetch Specs"}
                </button>
              </div>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                Miracoli looks online for a distributor PDF, then runs it through the same
                ingestion parser used by the vault.
              </p>
              {searchError ? <p className="mt-3 text-sm text-[#ff9a75]">{searchError}</p> : null}
              {searchResults.length ? (
                <div className="mt-4 space-y-3">
                  {searchResults.map((result) => (
                    <div
                      key={result.url}
                      className="rounded-[20px] border border-[var(--accent-border)] bg-black/10 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{result.parsed?.extracted.name ?? result.title}</p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">{result.url}</p>
                          {result.parsed ? (
                            <p className="mt-2 text-xs text-[var(--text-muted)]">
                              {result.parsed.extracted.extraction_source} | Fat {result.parsed.extracted.fat_pct}% |
                              Sugar {result.parsed.extracted.sugar_pct}% | Solids {result.parsed.extracted.total_solids_pct}%
                            </p>
                          ) : (
                            <p className="mt-2 text-xs text-[var(--text-muted)]">
                              PDF found, but the remote parse needs manual review.
                            </p>
                          )}
                        </div>
                        {result.parsed ? (
                          <button
                            type="button"
                            onClick={() => applyParsedSearchResult(result)}
                            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#1b1612]"
                          >
                            Use Parsed Specs
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Fat g / 100g
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={form.proxyFat}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      proxyFat: Number(event.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Sugars g / 100g
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={form.proxySugars}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      proxySugars: Number(event.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Protein g / 100g
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={form.proxyProtein}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      proxyProtein: Number(event.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Sugar Model
                </span>
                <select
                  value={form.proxySugarModel}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      proxySugarModel: event.target.value as ProxySugarModel,
                    }))
                  }
                  className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
                >
                  {Object.entries(proxySugarModels).map(([key, value]) => (
                    <option key={key} value={key} className="bg-[#1a1614]">
                      {key} - {value.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["fatPct", "Fat %"],
              ["sugarPct", "Sugar %"],
              ["solidsNonFatPct", "Protein / MSNF %"],
              ["otherSolidsPct", "Other Solids %"],
              ["pacValue", "PAC Value"],
              ["podValue", "POD Value"],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {label}
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={form[key as keyof CustomIngredientFormState] as number}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [key]: Number(event.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
                />
              </label>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b1612]"
          >
            Save Custom Ingredient
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--accent-border)] px-5 py-3 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
