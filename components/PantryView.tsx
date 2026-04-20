"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { IngredientReviewModal, type IngredientReviewValue } from "@/components/IngredientReviewModal";
import { IngredientUploader } from "@/components/IngredientUploader";
import { PriceManagementView } from "@/components/PriceManagementView";
import { useIngredientCosts } from "@/hooks/useIngredientCosts";
import { usePantry } from "@/hooks/usePantry";
import {
  createPantryStock,
  readStoredJson,
  STORAGE_KEYS,
  writeStoredJson,
  type ProfileSettings,
} from "@/lib/storage";
import type { CatalogSource } from "@/lib/catalog";
import type { Equipment, Ingredient } from "@/lib/default-data";
import type { ParsedIngredientPdf } from "@/lib/process-ingredient-pdf";

type PantryViewProps = {
  ingredients: Ingredient[];
  dataSource: CatalogSource;
  selectedEquipment: Equipment;
};

const categoryOrder: Ingredient["category"][] = [
  "Dairy",
  "Sugar",
  "Base/Stabilizer",
  "Flavor Paste",
  "Base",
  "Nut",
  "Chocolate",
  "Other",
];

export function PantryView({
  ingredients: initialIngredients,
  dataSource,
  selectedEquipment,
}: PantryViewProps) {
  const {
    ingredients,
    masterIngredients,
    customIngredients,
    loading,
    error,
    refresh,
    addOptimisticIngredient,
  } = usePantry({
    initialIngredients,
  });
  const [pantryStock, setPantryStock] = useState<Record<string, boolean>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [rawAuditText, setRawAuditText] = useState("");
  const [reviewValue, setReviewValue] = useState<IngredientReviewValue | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"master" | "custom" | "prices">("master");
  const [profile, setProfile] = useState<ProfileSettings>({ isMasterAdmin: false });
  const {
    pricing,
    setPricing,
    rows: priceRows,
    loading: priceLoading,
    savingId,
    error: priceError,
    setIngredientCost,
  } = useIngredientCosts({
    ingredients,
  });

  useEffect(() => {
    const defaultStock = createPantryStock(ingredients);
    const stored = readStoredJson<Record<string, boolean>>(STORAGE_KEYS.pantry, defaultStock);
    const storedProfile = readStoredJson<ProfileSettings>(STORAGE_KEYS.profile, {
      isMasterAdmin: false,
    });

    startTransition(() => {
      setPantryStock({ ...defaultStock, ...stored });
      setProfile(storedProfile);
      setIsHydrated(true);
    });
  }, [ingredients]);

  useEffect(() => {
    if (!isHydrated || !Object.keys(pantryStock).length) {
      return;
    }

    writeStoredJson(STORAGE_KEYS.pantry, pantryStock);
  }, [isHydrated, pantryStock]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    writeStoredJson(STORAGE_KEYS.profile, profile);
  }, [isHydrated, profile]);

  const groupedIngredients = useMemo(() => {
    const visibleIngredients = activeTab === "master" ? masterIngredients : customIngredients;

    if (activeTab === "prices") {
      return [];
    }

    const categories = new Set<Ingredient["category"]>(
      visibleIngredients.map((ingredient) => ingredient.category)
    );

    return categoryOrder
      .filter((category) => categories.has(category))
      .map((category) => ({
        category,
        items: visibleIngredients
          .filter((ingredient) => ingredient.category === category)
          .sort((left, right) => left.name.localeCompare(right.name)),
      }));
  }, [activeTab, customIngredients, masterIngredients]);

  const inStockCount = Object.values(pantryStock).filter(Boolean).length;
  const hotProcessDisabledMessage =
    "Selected equipment does not support pasteurization; please use Cold Process stabilizers.";

  const handleSaveReviewedIngredient = async () => {
    if (!scannedFile || !reviewValue) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const formData = new FormData();

      formData.append("pdf", scannedFile);
      formData.append(
        "payload",
        JSON.stringify({
          ...reviewValue,
          raw_ocr_dump: rawAuditText,
          publish_to_master: profile.isMasterAdmin,
        })
      );

      const response = await fetch("/api/pantry/ingredient-pdf", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        item?: Record<string, unknown>;
      };

      if (!response.ok || data.error || !data.item) {
        throw new Error(data.error ?? "Unable to save ingredient to Supabase.");
      }

      const savedItem: Ingredient = {
        id: String(data.item.id),
        name: String(data.item.name),
        brand_name: data.item.brand_name ? String(data.item.brand_name) : null,
        product_code: data.item.product_code ? String(data.item.product_code) : null,
        upc: data.item.upc ? String(data.item.upc) : null,
        category: data.item.category as Ingredient["category"],
        fat_pct: Number(data.item.fat_pct ?? 0),
        sugar_pct: Number(data.item.sugar_pct ?? 0),
        total_solids_pct: Number(data.item.total_solids_pct ?? 0),
        msnf_pct: Number(data.item.msnf_pct ?? data.item.solids_non_fat_pct ?? 0),
        solids_non_fat_pct: Number(data.item.solids_non_fat_pct ?? data.item.msnf_pct ?? 0),
        other_solids_pct: Number(data.item.other_solids_pct ?? 0),
        pac_value: Number(data.item.pac_value ?? 0),
        pod_value: Number(data.item.pod_value ?? 0),
        cost_per_kg: Number(data.item.cost_per_kg ?? 0),
        average_market_cost: Number(
          data.item.average_market_cost ?? data.item.cost_per_kg ?? 0
        ),
        is_cold_process: Boolean(data.item.is_cold_process),
        is_base_ingredient: Boolean(data.item.is_base_ingredient),
        is_master: Boolean(data.item.is_master),
        dosage_guideline:
          data.item.dosage_guideline === null || data.item.dosage_guideline === undefined
            ? data.item.dosage_guideline_per_kg === null ||
              data.item.dosage_guideline_per_kg === undefined
              ? null
              : Number(data.item.dosage_guideline_per_kg)
            : Number(data.item.dosage_guideline),
        pdf_url: data.item.pdf_url ? String(data.item.pdf_url) : null,
        raw_ocr_dump: data.item.raw_ocr_dump ? String(data.item.raw_ocr_dump) : null,
        extraction_source:
          data.item.extraction_source === "Nutritional Fallback"
            ? "Nutritional Fallback"
            : "Balancing Parameters",
        user_id: data.item.user_id ? String(data.item.user_id) : null,
        data_priority: "verified_lab_data",
      };

      startTransition(() => {
        addOptimisticIngredient(savedItem);
        setPantryStock((current) => ({
          ...current,
          [savedItem.name]: true,
        }));
      });
      setSaveSuccess(
        profile.isMasterAdmin
          ? `${savedItem.name} published to the Master Vault.`
          : `${savedItem.name} saved to My Custom Ingredients.`
      );
      setReviewOpen(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save ingredient.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
      <section className="luxury-card rounded-[34px] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">
              Pantry Control
            </p>
            <h1 className="font-serif text-4xl tracking-[-0.04em] text-[var(--accent)] sm:text-5xl">
              Upload center and ingredient availability
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
              Drop a PreGel tech sheet into the upload center to extract balancing data, review the
              confirm-ingredient modal, and push the ingredient into Supabase before it joins your
              pantry.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b1612]"
            >
              Back To Lab
            </Link>
            {profile.isMasterAdmin ? (
              <Link
                href="/admin/pantry"
                className="rounded-full border border-[rgba(212,175,55,0.28)] bg-[rgba(212,175,55,0.08)] px-5 py-3 text-sm"
              >
                Open Admin Workbench
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() =>
                setProfile((current) => ({
                  ...current,
                  isMasterAdmin: !current.isMasterAdmin,
                }))
              }
              className={`rounded-full border px-5 py-3 text-sm transition ${
                profile.isMasterAdmin
                  ? "border-[rgba(212,175,55,0.28)] bg-[rgba(212,175,55,0.08)]"
                  : "border-[var(--accent-border)]"
              }`}
            >
              Master Admin {profile.isMasterAdmin ? "On" : "Off"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">In Stock</p>
            <p className="metric-value mt-3 text-2xl font-semibold">{inStockCount}</p>
          </div>
          <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Catalog Source
            </p>
            <p className="metric-value mt-3 text-2xl font-semibold">{dataSource}</p>
          </div>
          <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Verified Ingredients
            </p>
            <p className="metric-value mt-3 text-2xl font-semibold">{masterIngredients.length}</p>
          </div>
          <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Process Gate
            </p>
            <p className="mt-3 text-sm text-[var(--foreground)]">
              {selectedEquipment.heating_capability
                ? "Hot and cold process ingredients available"
                : "Hot process ingredients locked out"}
            </p>
            {!selectedEquipment.heating_capability ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">{hotProcessDisabledMessage}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="luxury-card rounded-[30px] p-6 sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
              Pantry Dashboard
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
              Master Vault and Lab Bench
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm transition hover:border-[rgba(212,175,55,0.3)]"
          >
            Sync Pantry
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("master")}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              activeTab === "master"
                ? "border-[rgba(212,175,55,0.34)] bg-[rgba(212,175,55,0.12)]"
                : "border-[var(--accent-border)] bg-black/10"
            }`}
          >
            Master Vault
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              activeTab === "custom"
                ? "border-[rgba(212,175,55,0.34)] bg-[rgba(212,175,55,0.12)]"
                : "border-[var(--accent-border)] bg-black/10"
            }`}
          >
            My Custom Ingredients
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("prices")}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              activeTab === "prices"
                ? "border-[rgba(212,175,55,0.34)] bg-[rgba(212,175,55,0.12)]"
                : "border-[var(--accent-border)] bg-black/10"
            }`}
          >
            Price Management
          </button>
        </div>

        {activeTab === "custom" ? (
          <div className="mt-5">
            <IngredientUploader
              onParsed={(file, parsed: ParsedIngredientPdf) => {
                setScannedFile(file);
                setRawAuditText(parsed.rawText);
                setReviewValue(parsed.extracted);
                setReviewOpen(true);
                setSaveError(null);
                setSaveSuccess(null);
              }}
              onReviewRequested={() => setReviewOpen(true)}
            />
          </div>
        ) : activeTab === "master" ? (
          <div className="mt-5 rounded-[24px] border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.06)] p-4 text-sm text-[var(--text-muted)]">
            Verified master ingredients stay immutable for normal users. Sync pulls the latest master
            updates forward without overwriting anything on your lab bench.
          </div>
        ) : null}

        {saveSuccess ? (
          <div className="mt-5 rounded-[24px] border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.06)] p-4 text-sm text-[var(--foreground)]">
            {saveSuccess}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4 text-sm text-[var(--text-muted)]">
            Syncing pantry from Supabase...
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-[24px] border border-[rgba(255,140,111,0.28)] bg-[rgba(255,140,111,0.08)] p-4 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : null}
      </section>

      {activeTab === "prices" ? (
        <PriceManagementView
          ingredients={ingredients}
          pricing={pricing}
          rows={priceRows}
          savingId={savingId}
          loading={priceLoading}
          error={priceError}
          onPricingChange={setPricing}
          onCostChange={(ingredient, costPerKg) => {
            void setIngredientCost({ ingredient, costPerKg, currency: pricing.currency });
          }}
        />
      ) : null}

      {groupedIngredients.map((group) =>
        group.items.length ? (
          <section key={group.category} className="luxury-card rounded-[30px] p-6 sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">{group.category}</h2>
              <button
                type="button"
                onClick={() =>
                  setPantryStock((current) => {
                    const next = { ...current };

                    for (const ingredient of group.items) {
                      next[ingredient.name] = true;
                    }

                    return next;
                  })
                }
                className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm"
              >
                Restock Category
              </button>
            </div>

            <div className="recipe-grid">
              {group.items.map((ingredient) => {
                const enabled = pantryStock[ingredient.name] !== false;
                const hotProcessOnly = !ingredient.is_cold_process;
                const disabledByEquipment =
                  !selectedEquipment.heating_capability && hotProcessOnly;

                return (
                  <article
                    key={ingredient.id}
                    title={disabledByEquipment ? hotProcessDisabledMessage : undefined}
                    className={`rounded-[24px] border p-5 ${
                      disabledByEquipment
                        ? "border-[rgba(255,140,111,0.24)] bg-[rgba(255,140,111,0.05)] opacity-70"
                        : "border-[var(--accent-border)] bg-black/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-medium">{ingredient.name}</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                            {ingredient.data_priority.replaceAll("_", " ")}
                          </p>
                          {ingredient.is_master ? (
                            <span className="gold-chip rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em]">
                              Verified
                            </span>
                          ) : (
                            <span className="rounded-full border border-[var(--accent-border)] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                              Custom
                            </span>
                          )}
                        </div>
                        {disabledByEquipment ? (
                          <p className="mt-2 text-xs text-[var(--danger)]">{hotProcessDisabledMessage}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={disabledByEquipment}
                        onClick={() =>
                          setPantryStock((current) => ({
                            ...current,
                            [ingredient.name]: !enabled,
                          }))
                        }
                        className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] ${
                          enabled
                            ? "border-[rgba(212,175,55,0.34)] bg-[rgba(212,175,55,0.12)]"
                            : "border-[rgba(255,140,111,0.28)] bg-[rgba(255,140,111,0.08)] text-[var(--danger)]"
                        } ${disabledByEquipment ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        {disabledByEquipment
                          ? "Hot Only"
                          : ingredient.is_master
                            ? enabled
                              ? "Loaded"
                              : "Muted"
                            : enabled
                              ? "In Stock"
                              : "Out Of Stock"}
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-[18px] border border-[var(--accent-border)] bg-[rgba(255,255,255,0.02)] p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                          Fat
                        </p>
                        <p className="mt-2">{ingredient.fat_pct}%</p>
                      </div>
                      <div className="rounded-[18px] border border-[var(--accent-border)] bg-[rgba(255,255,255,0.02)] p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                          Dosage
                        </p>
                        <p className="mt-2">
                          {ingredient.dosage_guideline ? `${ingredient.dosage_guideline} g/kg` : "N/A"}
                        </p>
                      </div>
                      <div className="rounded-[18px] border border-[var(--accent-border)] bg-[rgba(255,255,255,0.02)] p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                          Process
                        </p>
                        <p className="mt-2">{ingredient.is_cold_process ? "Cold Ready" : "Hot Process Only"}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null
      )}

      <IngredientReviewModal
        open={reviewOpen && Boolean(reviewValue)}
        value={reviewValue ?? {
          name: "",
          brand_name: "",
          product_code: "",
          upc: "",
          revision_date: null,
          category: "Flavor Paste",
          fat_pct: 0,
          sugar_pct: 0,
          total_solids_pct: 0,
          msnf_pct: 0,
          protein_g: 0,
          kcal_per_100g: 0,
          pac_value: 0,
          pod_value: 0,
          dosage_guideline: null,
          cost_per_kg: 0,
          average_market_cost: 0,
          extraction_source: "Balancing Parameters",
          is_cold_process: true,
        }}
        rawText={rawAuditText}
        isMasterAdmin={profile.isMasterAdmin}
        onChange={setReviewValue}
        onClose={() => {
          setReviewOpen(false);
          setSaveError(null);
        }}
        onSave={handleSaveReviewedIngredient}
        saving={saving}
        errorMessage={saveError}
      />
    </main>
  );
}
