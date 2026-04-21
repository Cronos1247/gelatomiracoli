"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  ChevronsUpDown,
  Lock,
  Loader2,
  Save,
  Thermometer,
  Unlock,
} from "lucide-react";
import { TelemetryHUD } from "./TelemetryHUD";
import {
  RECIPE_ARCHETYPES,
  buildRecipeLabState,
  getFlavorCandidates,
  type RecipeArchetypeKey,
  type RecipeBaseType,
  type RecipeEngineIngredient,
  type RecipeIngredientRole,
} from "@/lib/recipe-lab-engine";

export type PortalLabIngredient = RecipeEngineIngredient;

export type PortalEquipmentUnit = {
  id: string;
  brand: string;
  model: string;
  min_batch_l: number;
  max_batch_l: number;
  default_overrun_pct: number;
};

export type PortalDisplayCase = {
  id: string;
  name: string;
  capacity_pans: number;
  target_temp_c: number;
  pac_range_min: number;
  pac_range_max: number;
  display_order: number;
  style: "Traditional" | "Pozzetti";
};

type SaveState = "idle" | "saving" | "success";
type ToastState =
  | {
      tone: "success" | "error";
      message: string;
    }
  | null;

const ARCHETYPE_OPTIONS = [
  { key: "milk-based-standard" as const, label: "Classic Crema" },
  { key: "high-fat" as const, label: "Rich Chocolate / Nut" },
  { key: "fruit-sorbet" as const, label: "Fresh Fruit Sorbet" },
  { key: "low-sugar" as const, label: "Custom Lab" },
  { key: "clean-label" as const, label: "From Scratch" },
  { key: "vegan" as const, label: "Vegan Structure" },
  { key: "sugar-free" as const, label: "Sugar-Free" },
];

const BASE_OPTIONS = [
  { value: "dairy" as const, label: "Dairy Matrix" },
  { value: "water" as const, label: "Water Matrix" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function roleLabel(role: RecipeIngredientRole) {
  switch (role) {
    case "flavor":
      return "Primary Flavor";
    case "totalbase":
      return "Structure Base";
    case "milk":
      return "Milk";
    case "cream":
      return "Cream";
    case "water":
      return "Water";
    case "sucrose":
      return "Sucrose";
    case "dextrose":
      return "Dextrose";
    case "maltodextrin":
      return "Maltodextrin";
    case "nfdm":
      return "NFDM";
    case "coconutFat":
      return "Coconut Fat";
    case "erythritol":
      return "Erythritol";
    case "polydextrose":
      return "Polydextrose";
    default:
      return role;
  }
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function GlassSelect<T extends string>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; subtitle?: string }>;
  onSelect: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="relative">
      <span className="mb-2 block font-mono text-xs uppercase tracking-[0.28em] text-white/38">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white backdrop-blur-xl transition hover:border-white/18 hover:bg-white/[0.08]"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{active?.label}</p>
          {active?.subtitle ? (
            <p className="mt-1 truncate text-xs text-white/45">{active.subtitle}</p>
          ) : null}
        </div>
        <ChevronsUpDown size={15} className="text-white/45" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute z-20 mt-3 w-full rounded-[1.5rem] border border-white/10 bg-[#0b0d15]/95 p-2 shadow-2xl backdrop-blur-2xl"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onSelect(option.value);
                  setOpen(false);
                }}
                className={classNames(
                  "w-full rounded-[1rem] px-3 py-3 text-left transition",
                  option.value === value
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <p className="text-sm font-medium">{option.label}</p>
                {option.subtitle ? <p className="mt-1 text-xs text-white/42">{option.subtitle}</p> : null}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function FlavorCombobox({
  ingredients,
  keyword,
  onSelect,
}: {
  ingredients: PortalLabIngredient[];
  keyword: string;
  onSelect: (ingredient: PortalLabIngredient) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(keyword);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setQuery(keyword);
  }, [keyword]);

  const options = useMemo(() => {
    const value = deferredQuery.trim().toLowerCase();
    const all = getFlavorCandidates(ingredients);
    const filtered = value
      ? all.filter((ingredient) =>
          `${ingredient.name} ${ingredient.category ?? ""}`.toLowerCase().includes(value)
        )
      : all;

    return filtered.slice(0, 10);
  }, [deferredQuery, ingredients]);

  return (
    <div className="relative">
      <span className="mb-2 block font-mono text-xs uppercase tracking-[0.28em] text-white/38">
        Primary Flavor
      </span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white backdrop-blur-xl transition hover:border-white/18 hover:bg-white/[0.08]"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{keyword}</p>
          <p className="mt-1 truncate text-xs text-white/42">Search the full Master Ledger</p>
        </div>
        <ChevronsUpDown size={15} className="text-white/45" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute z-20 mt-3 w-full rounded-[1.5rem] border border-white/10 bg-[#0b0d15]/95 p-3 shadow-2xl backdrop-blur-2xl"
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pistachio, hazelnut, chocolate, strawberry..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-[#00E5FF]/45 focus:bg-[#00E5FF]/5"
            />
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {options.map((ingredient) => (
                <button
                  key={`${ingredient.id ?? ingredient.name}-flavor`}
                  type="button"
                  onClick={() => {
                    onSelect(ingredient);
                    setOpen(false);
                  }}
                  className="w-full rounded-[1rem] border border-transparent bg-white/[0.03] px-3 py-3 text-left transition hover:border-white/10 hover:bg-white/[0.08]"
                >
                  <p className="text-sm font-medium text-white">{ingredient.name}</p>
                  <p className="mt-1 text-xs text-white/42">{ingredient.category ?? "Flavor"}</p>
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent = "cyan",
}: {
  label: string;
  value: string;
  accent?: "cyan" | "emerald";
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] backdrop-blur-xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/36">{label}</p>
      <p
        className={classNames(
          "mt-3 font-mono text-2xl font-bold",
          accent === "cyan"
            ? "text-[#00E5FF] drop-shadow-[0_0_12px_rgba(0,229,255,0.35)]"
            : "text-[#00E676] drop-shadow-[0_0_12px_rgba(0,230,118,0.25)]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

type FormulaRowProps = {
  batchWeight: number;
  onAuto: (role: RecipeIngredientRole) => void;
  onLockToggle: (role: RecipeIngredientRole) => void;
  onRemove: (role: RecipeIngredientRole) => void;
  onWeightChange: (role: RecipeIngredientRole, nextWeight: number) => void;
  row: ReturnType<typeof buildRecipeLabState>["rows"][number];
};

function FormulaRow({
  batchWeight,
  onAuto,
  onLockToggle,
  onRemove,
  onWeightChange,
  row,
}: FormulaRowProps) {
  const percentage = batchWeight > 0 ? (row.grams / batchWeight) * 100 : 0;

  return (
    <motion.div
      layout
      className="grid gap-4 rounded-[1.4rem] border border-white/8 bg-white/[0.02] px-4 py-4 transition-colors hover:bg-white/[0.05] md:grid-cols-[1.4fr_0.6fr_0.6fr_0.75fr]"
    >
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{row.name}</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-white/38">
              {roleLabel(row.role)} / {row.category ?? "Ingredient"}
            </p>
          </div>
          {row.ghost ? (
            <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-100">
              Suggested
            </span>
          ) : null}
        </div>
        {row.suggestionNote ? <p className="mt-2 text-xs text-white/48">{row.suggestionNote}</p> : null}
      </div>

      <div>
        <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-white/35">
          Weight
        </span>
        <input
          type="number"
          min={0}
          step={5}
          value={Number.isFinite(row.grams) ? row.grams : 0}
          onChange={(event) => onWeightChange(row.role, Number(event.target.value))}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-right font-mono text-lg text-[#00E5FF] outline-none transition focus:border-[#00E5FF]/45 focus:bg-[#00E5FF]/5"
        />
      </div>

      <div>
        <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-white/35">
          Share
        </span>
        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-right font-mono text-lg text-white/78">
          {percentage.toFixed(1)}%
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 md:justify-end">
        {row.role !== "totalbase" ? (
          <button
            type="button"
            onClick={() => onLockToggle(row.role)}
            className={classNames(
              "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em] transition",
              row.locked
                ? "border-white/16 bg-white/12 text-white"
                : "border-white/10 bg-white/[0.04] text-white/58 hover:text-white"
            )}
          >
            {row.locked ? <Lock size={13} /> : <Unlock size={13} />}
            <span>{row.locked ? "Locked" : "Auto"}</span>
          </button>
        ) : null}
        {row.locked ? (
          <button
            type="button"
            onClick={() => onAuto(row.role)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/58 transition hover:text-white"
          >
            Release
          </button>
        ) : null}
        {row.role !== "flavor" && row.role !== "totalbase" ? (
          <button
            type="button"
            onClick={() => onRemove(row.role)}
            className="rounded-full border border-rose-400/15 bg-rose-400/8 px-3 py-2 text-xs uppercase tracking-[0.18em] text-rose-100/80 transition hover:bg-rose-400/14"
          >
            Remove
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

export function PortalRecipeLab({
  displayCases,
  equipmentUnits,
  ingredients,
}: {
  displayCases: PortalDisplayCase[];
  equipmentUnits: PortalEquipmentUnit[];
  ingredients: PortalLabIngredient[];
}) {
  const [recipeName, setRecipeName] = useState("Pistachio Maestro");
  const [keyword, setKeyword] = useState("Pistachio");
  const [archetypeKey, setArchetypeKey] = useState<RecipeArchetypeKey>("high-fat");
  const [baseType, setBaseType] = useState<RecipeBaseType>("dairy");
  const [batchLiters, setBatchLiters] = useState(1);
  const [flavorIntensityPct, setFlavorIntensityPct] = useState(10);
  const [podBias, setPodBias] = useState(1);
  const [manualWeights, setManualWeights] = useState<Partial<Record<RecipeIngredientRole, number>>>({});
  const [locked, setLocked] = useState<Partial<Record<RecipeIngredientRole, boolean>>>({});
  const [ingredientOverrides, setIngredientOverrides] = useState<
    Partial<Record<RecipeIngredientRole, PortalLabIngredient>>
  >({});
  const [removedRoles, setRemovedRoles] = useState<Partial<Record<RecipeIngredientRole, boolean>>>({});
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(equipmentUnits[0]?.id ?? "");
  const [selectedCaseId, setSelectedCaseId] = useState(displayCases[0]?.id ?? "");
  const [overrunTargetPct, setOverrunTargetPct] = useState(
    equipmentUnits[0]?.default_overrun_pct ?? 35
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (saveState !== "success") {
      return;
    }

    const timeout = window.setTimeout(() => setSaveState("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [saveState]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const activeEquipment = useMemo(
    () => equipmentUnits.find((unit) => unit.id === selectedEquipmentId) ?? equipmentUnits[0] ?? null,
    [equipmentUnits, selectedEquipmentId]
  );

  const recipe = useMemo(
    () =>
      buildRecipeLabState({
        ingredients,
        keyword,
        archetypeKey,
        baseType,
        batchLiters,
        flavorIntensityPct,
        podBias,
        manualWeights,
        locked,
        ingredientOverrides,
        removedRoles,
      }),
    [
      ingredients,
      keyword,
      archetypeKey,
      baseType,
      batchLiters,
      flavorIntensityPct,
      podBias,
      manualWeights,
      locked,
      ingredientOverrides,
      removedRoles,
    ]
  );

  const costPerKg = useMemo(
    () => (recipe.batchWeight > 0 ? recipe.totalCost / (recipe.batchWeight / 1000) : 0),
    [recipe.batchWeight, recipe.totalCost]
  );

  const suggestedCase = useMemo(
    () =>
      displayCases.find(
        (displayCase) =>
          recipe.metrics.pac >= displayCase.pac_range_min &&
          recipe.metrics.pac <= displayCase.pac_range_max
      ) ?? null,
    [displayCases, recipe.metrics.pac]
  );

  const activeDisplayCase = useMemo(
    () =>
      displayCases.find((displayCase) => displayCase.id === selectedCaseId) ??
      suggestedCase ??
      displayCases[0] ??
      null,
    [displayCases, selectedCaseId, suggestedCase]
  );

  const hiddenRoles = useMemo(
    () =>
      Object.entries(removedRoles)
        .filter((entry): entry is [RecipeIngredientRole, boolean] => Boolean(entry[1]))
        .map(([role]) => role),
    [removedRoles]
  );

  function handleArchetypeChange(nextKey: RecipeArchetypeKey) {
    setArchetypeKey(nextKey);
    if (nextKey === "fruit-sorbet" || nextKey === "vegan") {
      setBaseType("water");
    } else if (baseType === "water") {
      setBaseType("dairy");
    }
  }

  function handleFlavorSelect(ingredient: PortalLabIngredient) {
    setKeyword(ingredient.name);
    setRecipeName(`${ingredient.name} ${RECIPE_ARCHETYPES[archetypeKey].label}`);
    setIngredientOverrides((current) => ({
      ...current,
      flavor: ingredient,
    }));
    setRemovedRoles((current) => ({
      ...current,
      flavor: false,
    }));
  }

  function handleWeightChange(role: RecipeIngredientRole, nextWeight: number) {
    const safeWeight = Number.isFinite(nextWeight) ? Math.max(0, nextWeight) : 0;

    setManualWeights((current) => ({
      ...current,
      [role]: safeWeight,
    }));
    setLocked((current) => ({
      ...current,
      [role]: true,
    }));
    setRemovedRoles((current) => ({
      ...current,
      [role]: false,
    }));
  }

  function releaseRole(role: RecipeIngredientRole) {
    setLocked((current) => ({
      ...current,
      [role]: false,
    }));
    setManualWeights((current) => {
      const next = { ...current };
      delete next[role];
      return next;
    });
  }

  function toggleLock(role: RecipeIngredientRole) {
    if (role === "totalbase") {
      return;
    }

    setLocked((current) => ({
      ...current,
      [role]: !current[role],
    }));
  }

  function removeRole(role: RecipeIngredientRole) {
    if (role === "flavor" || role === "totalbase") {
      return;
    }

    setRemovedRoles((current) => ({
      ...current,
      [role]: true,
    }));
    setLocked((current) => ({
      ...current,
      [role]: false,
    }));
    setManualWeights((current) => {
      const next = { ...current };
      delete next[role];
      return next;
    });
    setIngredientOverrides((current) => {
      const next = { ...current };
      delete next[role];
      return next;
    });
  }

  function restoreRole(role: RecipeIngredientRole) {
    setRemovedRoles((current) => ({
      ...current,
      [role]: false,
    }));
  }

  async function saveToVault() {
    if (saveState === "saving") {
      return;
    }

    if (!recipeName.trim()) {
      setToast({ tone: "error", message: "Recipe name is required before vaulting." });
      return;
    }

    setSaveState("saving");

    try {
      const payload = {
        recipeName: recipeName.trim(),
        ingredients: recipe.rows.map((row) => ({
          ingredientId: row.id,
          name: row.name,
          grams: row.grams,
          percentage: recipe.batchWeight > 0 ? (row.grams / recipe.batchWeight) * 100 : 0,
          category: row.category ?? "Other",
        })),
        totalPac: recipe.metrics.pac,
        totalPod: recipe.metrics.pod,
        totalSolids: recipe.metrics.solids,
        totalFat: recipe.metrics.fat,
        totalMixWeight: recipe.batchWeight,
        totalRecipeCost: recipe.totalCost,
        archetypeKey,
        baseType,
        batchLiters,
        flavorIntensityPct,
        podBias,
        equipmentId: activeEquipment?.id ?? null,
        activeCaseId: activeDisplayCase?.id ?? null,
        overrunTargetPct,
        keyword,
      };

      const [response] = await Promise.all([
        fetch("/api/portal/lab", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 450)),
      ]);

      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Unable to save this recipe.");
      }

      setSaveState("success");
      setToast({
        tone: "success",
        message: `Vaulted ${recipeName.trim()} / PAC ${recipe.metrics.pac} / POD ${recipe.metrics.pod}`,
      });
    } catch (error) {
      setSaveState("idle");
      setToast({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Unable to save this recipe right now.",
      });
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="space-y-8">
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#D4AF37]/75">
            Miracoli Physics Engine
          </p>
          <h1
            className="mt-4 text-5xl text-white"
            style={{ fontFamily: "var(--font-miracoli-serif)" }}
          >
            Recipe Lab
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-white/54">
            The Maestro command center: choose the archetype, lock the lead flavor, and let the balancing engine populate the full matrix with the same chemistry logic used on mobile.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_0_rgba(0,0,0,0.4)] backdrop-blur-2xl">
            <div className="grid gap-5 md:grid-cols-2">
              <GlassSelect
                label="Archetype"
                value={archetypeKey}
                options={ARCHETYPE_OPTIONS.map((option) => ({
                  value: option.key,
                  label: option.label,
                  subtitle: RECIPE_ARCHETYPES[option.key].subtitle,
                }))}
                onSelect={handleArchetypeChange}
              />
              <GlassSelect
                label="Base Matrix"
                value={baseType}
                options={BASE_OPTIONS}
                onSelect={setBaseType}
              />
              <FlavorCombobox ingredients={ingredients} keyword={keyword} onSelect={handleFlavorSelect} />
              <div>
                <span className="mb-2 block font-mono text-xs uppercase tracking-[0.28em] text-white/38">
                  Formula Name
                </span>
                <input
                  value={recipeName}
                  onChange={(event) => setRecipeName(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#00E5FF]/45 focus:bg-[#00E5FF]/5"
                />
              </div>
            </div>
          </section>
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_0_rgba(0,0,0,0.4)] backdrop-blur-2xl">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <span className="mb-2 block font-mono text-xs uppercase tracking-[0.28em] text-white/38">
                  Batch Size (L)
                </span>
                <input
                  type="number"
                  min={activeEquipment?.min_batch_l ?? 0.5}
                  max={activeEquipment?.max_batch_l ?? 20}
                  step={0.5}
                  value={batchLiters}
                  onChange={(event) => setBatchLiters(Math.max(0.5, Number(event.target.value) || 0.5))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-white outline-none transition focus:border-[#00E5FF]/45 focus:bg-[#00E5FF]/5"
                />
              </div>
              <div>
                <span className="mb-2 block font-mono text-xs uppercase tracking-[0.28em] text-white/38">
                  Overrun Target %
                </span>
                <input
                  type="number"
                  min={0}
                  max={80}
                  step={1}
                  value={overrunTargetPct}
                  onChange={(event) => setOverrunTargetPct(Math.max(0, Number(event.target.value) || 0))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-white outline-none transition focus:border-[#00E5FF]/45 focus:bg-[#00E5FF]/5"
                />
              </div>
              <GlassSelect
                label="Batch Freezer"
                value={selectedEquipmentId}
                options={equipmentUnits.map((unit) => ({
                  value: unit.id,
                  label: `${unit.brand} ${unit.model}`,
                  subtitle: `${unit.min_batch_l.toFixed(1)}L-${unit.max_batch_l.toFixed(1)}L`,
                }))}
                onSelect={(nextId) => {
                  setSelectedEquipmentId(nextId);
                  const nextUnit = equipmentUnits.find((unit) => unit.id === nextId);
                  if (nextUnit) {
                    setOverrunTargetPct(nextUnit.default_overrun_pct);
                  }
                }}
              />
              <GlassSelect
                label="Display Case"
                value={activeDisplayCase?.id ?? displayCases[0]?.id ?? ""}
                options={displayCases.map((displayCase) => ({
                  value: displayCase.id,
                  label: displayCase.name,
                  subtitle: `${displayCase.style} / ${displayCase.pac_range_min}-${displayCase.pac_range_max} PAC`,
                }))}
                onSelect={setSelectedCaseId}
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-[0.28em] text-white/38">
                    Flavor Load
                  </span>
                  <span className="font-mono text-xs text-white/58">{flavorIntensityPct.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={20}
                  step={0.5}
                  value={flavorIntensityPct}
                  onChange={(event) => setFlavorIntensityPct(Number(event.target.value))}
                  className="w-full accent-cyan-300"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-[0.28em] text-white/38">
                    Sweetness Bias
                  </span>
                  <span className="font-mono text-xs text-white/58">{podBias.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.65}
                  max={1.2}
                  step={0.01}
                  value={podBias}
                  onChange={(event) => setPodBias(Number(event.target.value))}
                  className="w-full accent-cyan-300"
                />
              </div>
            </div>
          </section>
        </div>

        <section className="space-y-4">
          <TelemetryHUD
            totalPac={recipe.metrics.pac}
            totalPod={recipe.metrics.pod}
            totalSolids={recipe.metrics.solids}
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Fat" value={`${recipe.metrics.fat.toFixed(1)}%`} />
            <SummaryCard label="Total Batch Cost" value={formatCurrency(recipe.totalCost)} accent="emerald" />
            <SummaryCard label="Cost / kg" value={formatCurrency(costPerKg)} accent="emerald" />
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/36">
                    Target Case
                  </p>
                  <p className="mt-3 text-base font-medium text-white">
                    {activeDisplayCase?.name ?? "No active display case"}
                  </p>
                  <p className="mt-1 text-xs text-white/42">
                    {activeDisplayCase
                      ? `${activeDisplayCase.style} / ${activeDisplayCase.target_temp_c.toFixed(1)}°C`
                      : "Assign a case to route this formula"}
                  </p>
                </div>
                {activeDisplayCase ? (
                  <div className="rounded-full border border-[#FF073A]/20 bg-black/40 px-3 py-2 font-mono text-[#FF073A] drop-shadow-[0_0_12px_rgba(255,7,58,0.4)]">
                    <div className="flex items-center gap-2">
                      <Thermometer size={14} />
                      <span>{activeDisplayCase.target_temp_c.toFixed(1)}°C</span>
                    </div>
                  </div>
                ) : null}
              </div>
              {suggestedCase && activeDisplayCase?.id !== suggestedCase.id ? (
                <p className="mt-4 text-xs text-cyan-100/78">
                  Suggested by PAC: {suggestedCase.name}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_0_rgba(0,0,0,0.4)] backdrop-blur-2xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/36">
                Formula Matrix
              </p>
              <h2
                className="mt-3 text-3xl text-white"
                style={{ fontFamily: "var(--font-miracoli-serif)" }}
              >
                {recipeName}
              </h2>
              <p className="mt-2 text-sm text-white/52">
                {RECIPE_ARCHETYPES[archetypeKey].label} / {baseType === "dairy" ? "Dairy Matrix" : "Water Matrix"} / {recipe.batchWeight.toFixed(0)} g
              </p>
            </div>
            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-cyan-50">
              Auto-populated from Maestro logic
            </div>
          </div>

          {hiddenRoles.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {hiddenRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => restoreRole(role)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:text-white"
                >
                  Restore {roleLabel(role)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            <AnimatePresence initial={false}>
              {recipe.rows.map((row) => (
                <FormulaRow
                  key={row.role}
                  batchWeight={recipe.batchWeight}
                  onAuto={releaseRole}
                  onLockToggle={toggleLock}
                  onRemove={removeRole}
                  onWeightChange={handleWeightChange}
                  row={row}
                />
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-[1.6rem] border border-white/10 bg-black/20 px-5 py-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-white/36">
                Batch Summary
              </p>
              <p className="font-mono text-3xl text-[#00E5FF] drop-shadow-[0_0_12px_rgba(0,229,255,0.28)]">
                {recipe.batchWeight.toFixed(0)}g
              </p>
              <p className="text-sm text-white/48">
                Hardware: {activeEquipment ? `${activeEquipment.brand} ${activeEquipment.model}` : "Not selected"} / Overrun {overrunTargetPct.toFixed(0)}%
              </p>
            </div>

            <motion.button
              type="button"
              onClick={() => void saveToVault()}
              disabled={saveState === "saving"}
              whileHover={saveState === "idle" ? { scale: 1.02 } : undefined}
              whileTap={saveState === "idle" ? { scale: 0.98 } : undefined}
              className={classNames(
                "inline-flex min-w-48 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-medium transition",
                saveState === "success"
                  ? "border-[#00E676]/30 bg-[#00E676]/20 text-[#C9FFDD]"
                  : "border-white/15 bg-white/10 text-white hover:bg-white/18",
                saveState === "saving" && "cursor-wait"
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {saveState === "saving" ? (
                  <motion.span
                    key="saving"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 size={16} className="animate-spin text-[#00E5FF]" />
                    <span>Syncing Vault</span>
                  </motion.span>
                ) : saveState === "success" ? (
                  <motion.span
                    key="success"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2"
                  >
                    <Check size={16} />
                    <span>Vaulted</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2"
                  >
                    <Save size={16} />
                    <span>Save to Vault</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className={classNames(
              "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-6 py-3 shadow-2xl backdrop-blur-2xl",
              toast.tone === "success"
                ? "border-white/10 bg-black/60 text-white"
                : "border-rose-400/20 bg-black/70 text-rose-100"
            )}
          >
            <div className="flex items-center gap-3">
              {toast.tone === "success" ? (
                <Check size={16} className="text-[#00E676]" />
              ) : (
                <AlertCircle size={16} className="text-[#FF073A]" />
              )}
              <span className="text-sm text-white/88">{toast.message}</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
