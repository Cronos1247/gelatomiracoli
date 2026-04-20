"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { RecipePdfSheet } from "@/components/RecipePdfSheet";
import {
  CustomIngredientModal,
  defaultCustomIngredientForm,
  makeIngredientFromForm,
  type CustomIngredientFormState,
} from "@/components/CustomIngredientModal";
import { MetricCard, InvoiceRow, SliderRow, ToggleChip } from "@/components/GelatoPrimitives";
import { LibraryModal } from "@/components/LibraryModal";
import { RecipeBookSection } from "@/components/RecipeBookSection";
import {
  ChefCommandBar,
  LabOnboardingSetup,
  LanguageToggle,
  MiracoliDashboard,
  RecipeIngredientRow,
  GeneratorInput,
  RecipeTypeSelector,
} from "@/src/miracoli/components";
import {
  ARCHETYPES,
  useEquipmentPhysics,
  useReactiveBalancer,
  type ArchetypeKey,
} from "@/src/miracoli/engine";
import type { CatalogSource } from "@/lib/catalog";
import type { TargetProfileKey } from "@/lib/balance-gelato";
import { applyEconomicsToRecipe } from "@/lib/economics";
import { generateRecipeFromKeyword } from "@/lib/maestro-generator";
import { resolveFlavorArchetype } from "@/lib/template-engine";
import {
  defaultEquipment,
  flavorProfiles,
  sugarOptions,
  type AppSettingRecord,
  type BaseType,
  type CustomIngredientInput,
  type DisplayType,
  type Equipment,
  type FlavorKey,
  type Ingredient,
  type Stabilizer,
  type SugarOption,
} from "@/lib/default-data";
import { useIngredientCosts } from "@/hooks/useIngredientCosts";
import {
  createPantryStock,
  readStoredJson,
  STORAGE_KEYS,
  writeStoredJson,
  type PantryStock,
  type ProfileSettings,
  type RecipeBookEntry,
  type StudioSnapshot,
} from "@/lib/storage";
import { syncLabSettings, syncRecipeSnapshot } from "@/lib/miracoli-sync";
import type { ChefAssistantRecipeDraft } from "@/lib/chef-assistant/types";
import { getDateLocale, translateIngredientLabel, type AppLanguage } from "@/lib/i18n";
import { useLanguage } from "@/src/miracoli/i18n/LanguageProvider";
import {
  RecipeProvider,
  type AssistantPulseTarget,
  type RecipeAssistantSnapshot,
} from "@/src/miracoli/recipe/RecipeContext";

type GelatoStudioProps = {
  ingredients: Ingredient[];
  stabilizers: Stabilizer[];
  equipment: Equipment[];
  settings: AppSettingRecord;
  dataSource: CatalogSource;
};

const formatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

function formatMetric(value: number, suffix = "") {
  return `${formatter.format(value)}${suffix}`;
}

function buildRecipeName(
  labName: string,
  flavorKey: FlavorKey,
  baseType: BaseType,
  batchKg: number
) {
  return `${labName} ${flavorProfiles[flavorKey].label} ${baseType} ${formatMetric(batchKg, "kg")}`;
}

function clampBatchSize(value: number, selectedEquipment: Equipment) {
  return Math.max(0.5, Math.min(value, selectedEquipment.max_batch_kg));
}

const quickStartChecklist = [
  {
    label: "I use 35% Heavy Cream",
    description: "Cream line for classic dairy fat support and premium body.",
    terms: ["heavy cream", "cream (35"],
  },
  {
    label: "I have Dextrose",
    description: "Lets the solver push PAC colder without over-sweetening the mix.",
    terms: ["dextrose"],
  },
  {
    label: "I keep NFDM on hand",
    description: "Useful when you want tighter solids control without extra fat.",
    terms: ["nfdm", "non-fat dry milk"],
  },
  {
    label: "I stock Invert Sugar",
    description: "Helps round sweetness curves and reduce crystallization risk.",
    terms: ["invert sugar"],
  },
  {
    label: "I stock Polydextrose",
    description: "Supports sugar reduction while keeping body in the spoon.",
    terms: ["polydextrose"],
  },
] as const;

const archetypeFlavorDefaults: Record<ArchetypeKey, FlavorKey> = {
  "milk-based-standard": "fior-di-latte",
  "high-fat-chocolate-nut": "dark-chocolate",
  "fruit-sorbet": "strawberry",
  "low-sugar-modern": "fior-di-latte",
};

function inferArchetypeFromFlavorKey(flavor: FlavorKey): ArchetypeKey {
  if (flavor === "strawberry") {
    return "fruit-sorbet";
  }

  if (flavor === "dark-chocolate" || flavor === "pistachio" || flavor === "gianduja") {
    return "high-fat-chocolate-nut";
  }

  return "milk-based-standard";
}

function mapGeneratorArchetype(
  archetype: "Chocolate" | "Nut" | "Fruit" | "Custard"
): ArchetypeKey {
  if (archetype === "Fruit") {
    return "fruit-sorbet";
  }

  if (archetype === "Chocolate" || archetype === "Nut") {
    return "high-fat-chocolate-nut";
  }

  return "milk-based-standard";
}

function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

export function GelatoStudio({
  ingredients,
  stabilizers,
  equipment,
  settings,
  dataSource,
}: GelatoStudioProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const initialEquipment =
    equipment.find((item) => item.id === settings.equipment_id) ?? equipment[0] ?? defaultEquipment[0];
  const fallbackStudio: StudioSnapshot = {
    labName: settings.lab_name ?? "Miracoli Lab",
    logoUrl: settings.logo_url,
  };
  const [labName, setLabName] = useState(fallbackStudio.labName);
  const [logoPreview, setLogoPreview] = useState<string | null>(fallbackStudio.logoUrl);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(initialEquipment.id);
  const [displayType, setDisplayType] = useState<DisplayType>(settings.display_type);
  const [availableSugars, setAvailableSugars] = useState<SugarOption[]>(
    settings.available_sugars?.length ? settings.available_sugars : sugarOptions
  );
  const [baseType, setBaseType] = useState<BaseType>(
    initialEquipment.heating_capability ? "Hot" : "Cold"
  );
  const [batchKg, setBatchKg] = useState(Math.min(4.5, initialEquipment.max_batch_kg));
  const [flavorKey, setFlavorKey] = useState<FlavorKey>("dark-chocolate");
  const [targetFatPct, setTargetFatPct] = useState(flavorProfiles["dark-chocolate"].targetFatPct);
  const [overrunPct, setOverrunPct] = useState(initialEquipment.default_overrun_pct);
  const [recipeBook, setRecipeBook] = useState<RecipeBookEntry[]>([]);
  const [pantryStock, setPantryStock] = useState<PantryStock>({});
  const [profile, setProfile] = useState<ProfileSettings>({ isMasterAdmin: false });
  const [sugarReduction, setSugarReduction] = useState(false);
  const [recipeStartMode, setRecipeStartMode] = useState<"precision" | "inspiration">(
    "inspiration"
  );
  const [selectedArchetype, setSelectedArchetype] =
    useState<ArchetypeKey>("high-fat-chocolate-nut");
  const [recipeStyle, setRecipeStyle] = useState<TargetProfileKey>("Gelato");
  const [targetFatOverride, setTargetFatOverride] = useState<number | null>(null);
  const [targetPacOverride, setTargetPacOverride] = useState<number | null>(null);
  const [targetPodOverride, setTargetPodOverride] = useState<number | null>(null);
  const [targetSolidsOverride, setTargetSolidsOverride] = useState<number | null>(null);
  const [generatorKeyword, setGeneratorKeyword] = useState("");
  const [generatorBusy, setGeneratorBusy] = useState(false);
  const [generatorMessage, setGeneratorMessage] = useState<string | null>(null);
  const [assistantPulseTarget, setAssistantPulseTarget] = useState<AssistantPulseTarget>(null);
  const [assistantChangeLog, setAssistantChangeLog] = useState<{
    message: string;
    snapshot: RecipeAssistantSnapshot;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customForm, setCustomForm] = useState<CustomIngredientFormState>(
    defaultCustomIngredientForm
  );
  const [customIngredients, setCustomIngredients] = useState<CustomIngredientInput[]>([]);
  const [exportingRecipe, setExportingRecipe] = useState<RecipeBookEntry | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [labSetupSaveState, setLabSetupSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(getDateLocale(language), {
        dateStyle: "medium",
      }),
    [language]
  );

  const selectedEquipment =
    equipment.find((item) => item.id === selectedEquipmentId) ?? initialEquipment;
  const heatingCapable = selectedEquipment.heating_capability;
  const activeArchetype = ARCHETYPES[selectedArchetype];
  const nfdmInStock = pantryStock.NFDM !== false;
  const {
    pricing,
    setPricing,
    priceLookup,
  } = useIngredientCosts({
    ingredients,
  });
  const { defaultOverrunPct, expansionFactor, outputView, setOutputView, pacRange } =
    useEquipmentPhysics({
      selectedEquipment,
      displayType,
    });

  useEffect(() => {
    const defaultPantry = createPantryStock(ingredients);
    const storedRecipes = readStoredJson<RecipeBookEntry[]>(STORAGE_KEYS.recipeBook, []);
    const storedPantry = readStoredJson<PantryStock>(STORAGE_KEYS.pantry, defaultPantry);
    const storedStudio = readStoredJson<StudioSnapshot>(STORAGE_KEYS.studio, {
      labName: settings.lab_name ?? "Miracoli Lab",
      logoUrl: settings.logo_url,
    });
    const storedProfile = readStoredJson<ProfileSettings>(STORAGE_KEYS.profile, {
      isMasterAdmin: false,
    });

    startTransition(() => {
      setRecipeBook(storedRecipes);
      setPantryStock({ ...defaultPantry, ...storedPantry });
      setLabName(storedStudio.labName);
      setLogoPreview(storedStudio.logoUrl);
      setProfile(storedProfile);
      setIsHydrated(true);
    });
  }, [ingredients, settings.lab_name, settings.logo_url]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    writeStoredJson(STORAGE_KEYS.recipeBook, recipeBook);
  }, [isHydrated, recipeBook]);

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

    writeStoredJson(STORAGE_KEYS.studio, {
      labName,
      logoUrl: logoPreview,
    } satisfies StudioSnapshot);
  }, [isHydrated, labName, logoPreview]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    writeStoredJson(STORAGE_KEYS.profile, profile);
  }, [isHydrated, profile]);

  useEffect(() => {
    if (!heatingCapable) {
      setBaseType("Cold");
    }

    setBatchKg((current) => clampBatchSize(current, selectedEquipment));
    setOverrunPct(defaultOverrunPct);
  }, [defaultOverrunPct, heatingCapable, selectedEquipment]);

  const resolvedFlavorProfile = useMemo(
    () =>
      resolveFlavorArchetype(flavorProfiles[flavorKey], [
        ...ingredients,
        ...customIngredients.map((item) => item.ingredient),
      ]),
    [customIngredients, flavorKey, ingredients]
  );

  useEffect(() => {
    setTargetFatPct(targetFatOverride ?? resolvedFlavorProfile.targetFatPct);
  }, [resolvedFlavorProfile.targetFatPct, targetFatOverride]);

  useEffect(() => {
    if (labSetupSaveState === "saved" || labSetupSaveState === "error") {
      setLabSetupSaveState("idle");
    }
  }, [availableSugars, displayType, labName, logoPreview, pantryStock, selectedEquipmentId, labSetupSaveState]);

  const recipeName = useMemo(
    () => buildRecipeName(labName, flavorKey, baseType, batchKg),
    [baseType, batchKg, flavorKey, labName]
  );
  const generatorSuggestion = useMemo(() => {
    const normalized = generatorKeyword.trim().toLowerCase();

    if (!normalized) {
      return null;
    }

    const terms = normalized.split(/[^a-z0-9]+/).filter((term) => term.length >= 3);
    const match = ingredients.find((ingredient) => {
      const haystack = `${ingredient.name} ${ingredient.brand_name ?? ""}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });

    return match ? `...using ${match.name}?` : null;
  }, [generatorKeyword, ingredients]);
  const fatSliderBounds = useMemo(() => {
    if (selectedArchetype === "fruit-sorbet") {
      return { min: 0, max: 2, step: 0.1 };
    }

    if (selectedArchetype === "high-fat-chocolate-nut") {
      return { min: 8, max: 16, step: 0.1 };
    }

    return { min: 6, max: 12, step: 0.1 };
  }, [selectedArchetype]);
  const {
    flavorIntensity,
    setFlavorIntensity,
    flavorRow,
    recipe: currentRecipe,
    error: currentRecipeError,
    textureAlert,
  } = useReactiveBalancer({
    targetBatchKg: batchKg,
    flavorProfile: flavorKey,
    baseType,
    displayType,
    equipment: selectedEquipment,
    ingredientLibrary: [...ingredients, ...customIngredients.map((item) => item.ingredient)],
    stabilizerLibrary: stabilizers,
    availableSugars,
    targetFatPct,
    targetPac: targetPacOverride ?? undefined,
    targetPodPct: targetPodOverride ?? undefined,
    targetSolidsPct: targetSolidsOverride ?? undefined,
    overrunPct,
    retailPricePerLiter: pricing.retailPricePerLiter,
    targetMarginPct: pricing.targetMarginPct,
    priceLookup,
    economicsMode: pricing.costMode,
    pricing,
    customIngredients,
    sugarReduction,
    pantryStock,
    recipeStyle,
  });
  const liveRecipeBook = useMemo(
    () =>
      recipeBook.map((recipe) => {
        const economics = applyEconomicsToRecipe({
          recipe,
          priceLookup,
          pricing,
        });

        return {
          ...recipe,
          ingredients: economics.ingredients,
          metrics: economics.metrics,
        };
      }),
    [priceLookup, pricing, recipeBook]
  );
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const filteredRecipes = useMemo(() => {
    if (!deferredSearch) {
      return liveRecipeBook;
    }

    return liveRecipeBook.filter((recipe) => {
      const haystack = `${recipe.recipeName} ${recipe.title} ${recipe.baseType}`.toLowerCase();
      return haystack.includes(deferredSearch);
    });
  }, [deferredSearch, liveRecipeBook]);
  const verifiedIngredientCount = useMemo(
    () => ingredients.filter((ingredient) => ingredient.is_master).length,
    [ingredients]
  );
  const preflightStatus = useMemo(
    () => ({
      equipmentReady: Boolean(selectedEquipment?.id),
      environmentReady: Boolean(displayType),
      pantryReady: verifiedIngredientCount > 0,
    }),
    [displayType, selectedEquipment?.id, verifiedIngredientCount]
  );

  const quickStartItems = useMemo(() => {
    return quickStartChecklist
      .map((item) => {
        const matchedIngredient = ingredients.find((ingredient) =>
          item.terms.some((term) => ingredient.name.toLowerCase().includes(term))
        );

        if (!matchedIngredient) {
          return null;
        }

        return {
          label: item.label,
          description: item.description,
          ingredientName: matchedIngredient.name,
          inStock: pantryStock[matchedIngredient.name] !== false,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [ingredients, pantryStock]);

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const dataUrl = await toDataUrl(file);
      setLogoPreview(dataUrl);
    } catch {
      setErrorMessage("Logo upload could not be read. Please try another image.");
    }
  };

  const toggleSugar = (sugar: SugarOption) => {
    setAvailableSugars((current) => {
      const next = current.includes(sugar)
        ? current.filter((item) => item !== sugar)
        : [...current, sugar];
      return next.length ? next : current;
    });
    setLabSetupSaveState("idle");
  };

  const handleQuickStartToggle = (ingredientName: string) => {
    const matchedSugar = sugarOptions.find((sugar) => sugar === ingredientName);

    setPantryStock((current) => {
      const nextValue = current[ingredientName] === false;
      return {
        ...current,
        [ingredientName]: nextValue,
      };
    });

    if (matchedSugar) {
      setAvailableSugars((current) => {
        const isAvailable = current.includes(matchedSugar);

        if (isAvailable) {
          if (current.length === 1) {
            return current;
          }

          return current.filter((item) => item !== matchedSugar);
        }

        return [...current, matchedSugar];
      });
    }

    setLabSetupSaveState("idle");
  };

  const handleSelectEquipmentBrand = (brand: string) => {
    const nextEquipment = equipment.find((item) => item.brand === brand);

    if (!nextEquipment) {
      return;
    }

    setSelectedEquipmentId(nextEquipment.id);
    setLabSetupSaveState("idle");
  };

  const handlePersistLabSetup = async () => {
    setLabSetupSaveState("saving");

    try {
      await syncLabSettings({
        display_type: displayType,
        equipment_id: selectedEquipment.id,
        lab_name: labName,
        logo_url: logoPreview,
        available_sugars: availableSugars,
      });
      setLabSetupSaveState("saved");
    } catch (error) {
      setLabSetupSaveState("error");
      setErrorMessage(
        error instanceof Error
          ? `${error.message} Your lab setup is still saved locally in this browser.`
          : "Lab setup save failed. Your changes are still stored locally."
      );
    }
  };

  const handleSaveRecipe = async () => {
    if (!currentRecipe) {
      return;
    }

    const createdAt = new Date().toISOString();
    const nextEntry: RecipeBookEntry = {
      ...currentRecipe,
      id: `${Date.now()}`,
      recipeName,
      createdAt,
      equipmentId: selectedEquipment.id,
      isSorbet: currentRecipe.targetProfile === "Sorbet",
      logicSnapshot: {
        flavorIntensityPct: flavorIntensity,
        targetFatPct,
        targetPac:
          targetPacOverride ?? (currentRecipe.metrics.pacRange.min + currentRecipe.metrics.pacRange.max) / 2,
        targetPodPct: targetPodOverride ?? currentRecipe.metrics.podPct,
        targetSolidsPct: targetSolidsOverride ?? currentRecipe.metrics.solidsPct,
        displayType,
        recipeStyle: currentRecipe.targetProfile,
        archetypeKey: selectedArchetype,
        sugarReduction,
        overrunPct,
        targetMarginPct: pricing.targetMarginPct,
        retailPricePerLiter: pricing.retailPricePerLiter,
        pricingMode: pricing.costMode,
      },
      syncedAt: null,
    };

    startTransition(() => {
      setRecipeBook((existing) => [nextEntry, ...existing]);
    });

    try {
      const syncResult = await syncRecipeSnapshot(nextEntry);

      startTransition(() => {
        setRecipeBook((existing) =>
          existing.map((entry) =>
            entry.id === nextEntry.id ? { ...entry, syncedAt: syncResult.syncedAt } : entry
          )
        );
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `${error.message} The recipe snapshot is still saved locally.`
          : "Recipe saved locally, but Supabase sync failed."
      );
    }
  };

  const handleScaleRecipe = (recipe: RecipeBookEntry) => {
    const snapshot = recipe.logicSnapshot;

    setFlavorKey(recipe.flavorKey);
    setBatchKg(clampBatchSize(recipe.totalMixWeight / 1000, selectedEquipment));
    setTargetFatOverride(snapshot?.targetFatPct ?? null);
    setTargetPacOverride(snapshot?.targetPac ?? null);
    setTargetPodOverride(snapshot?.targetPodPct ?? null);
    setTargetSolidsOverride(snapshot?.targetSolidsPct ?? recipe.metrics.solidsPct);
    setTargetFatPct(snapshot?.targetFatPct ?? recipe.metrics.fatPct);
    setOverrunPct(snapshot?.overrunPct ?? recipe.overrunPct);
    setDisplayType((snapshot?.displayType as DisplayType | undefined) ?? displayType);
    setRecipeStyle(recipe.targetProfile);
    setSelectedArchetype(
      ((snapshot?.archetypeKey as ArchetypeKey | undefined) ??
        inferArchetypeFromFlavorKey(recipe.flavorKey)) as ArchetypeKey
    );
    setSugarReduction(snapshot?.sugarReduction ?? false);
    setFlavorIntensity(snapshot?.flavorIntensityPct ?? 100);
    setBaseType(recipe.baseType);
    window.location.hash = "#lab";
  };

  const handleGenerateRecipe = () => {
    if (!generatorKeyword.trim()) {
      return;
    }

    setGeneratorBusy(true);
    setGeneratorMessage(null);
    setRecipeStartMode("inspiration");

    try {
      const draft = generateRecipeFromKeyword(generatorKeyword, batchKg, {
        ingredientLibrary: [...ingredients, ...customIngredients.map((item) => item.ingredient)],
        pantryStock,
        displayType,
        availableSugars,
        equipment: selectedEquipment,
      });

      setSelectedArchetype(mapGeneratorArchetype(draft.archetype));
      setFlavorKey(draft.flavorKey);
      setRecipeStyle(draft.recipeStyle);
      setTargetFatOverride(draft.targetFatPct);
      setTargetPacOverride(draft.targetPac);
      setTargetPodOverride(draft.targetPodPct);
      setTargetSolidsOverride(draft.targetSolidsPct);
      setTargetFatPct(draft.targetFatPct);
      setBaseType(draft.recipe.baseType);
      setGeneratorMessage(
        draft.disclaimer ??
          `Calculated proportions are live. ${draft.matchedIngredients.length ? `Matched: ${draft.matchedIngredients.map((item) => item.name).join(", ")}.` : "Using archetype pantry defaults."}`
      );
      window.location.hash = "#lab";
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to generate a recipe from that keyword."
      );
    } finally {
      setGeneratorBusy(false);
    }
  };

  const applyArchetypeSelection = (nextArchetype: ArchetypeKey) => {
    const archetype = ARCHETYPES[nextArchetype];
    const recommendedFlavor =
      nextArchetype === "high-fat-chocolate-nut" &&
      (flavorKey === "dark-chocolate" || flavorKey === "pistachio" || flavorKey === "gianduja")
        ? flavorKey
        : nextArchetype === "low-sugar-modern" &&
            (flavorKey === "dark-chocolate" || flavorKey === "pistachio" || flavorKey === "strawberry")
          ? flavorKey
          : archetypeFlavorDefaults[nextArchetype];

    setSelectedArchetype(nextArchetype);
    setRecipeStartMode("inspiration");
    setRecipeStyle(archetype.recipeStyle);
    setTargetFatOverride(archetype.targetFatPct);
    setTargetPacOverride(archetype.targetPac);
    setTargetPodOverride(archetype.targetPodPct);
    setTargetSolidsOverride(archetype.targetSolidsPct);
    setTargetFatPct(archetype.targetFatPct);
    setFlavorKey(recommendedFlavor);
    setBaseType(archetype.recipeStyle === "Sorbet" ? "Cold" : heatingCapable ? "Hot" : "Cold");
    setGeneratorMessage(
      `${archetype.label} targets loaded. Fat ${archetype.targetFatPct}%, PAC ${archetype.targetPac}, POD ${archetype.targetPodPct}.`
    );

    if (nextArchetype === "fruit-sorbet" && !generatorKeyword.trim()) {
      setGeneratorKeyword("Strawberry");
    }
  };

  const handleAssistantLoadIntoLab = (draft: ChefAssistantRecipeDraft) => {
    setSelectedArchetype(draft.archetypeKey);
    setRecipeStartMode("inspiration");
    setFlavorKey(draft.flavorKey);
    setRecipeStyle(draft.recipeStyle);
    setTargetFatOverride(draft.targetFatPct);
    setTargetPacOverride(draft.targetPac);
    setTargetPodOverride(draft.targetPodPct);
    setTargetSolidsOverride(draft.targetSolidsPct);
    setTargetFatPct(draft.targetFatPct);
    setBaseType(draft.baseType);
    setGeneratorKeyword(draft.keyword);
    setGeneratorMessage(draft.note);
    window.location.hash = "#lab";
  };

  const proactiveCopilotAlert =
    currentRecipe && currentRecipe.metrics.solidsPct > 40 ? t("copilotAlertSandy") : null;

  useEffect(() => {
    if (!assistantPulseTarget) {
      return;
    }

    const timer = window.setTimeout(() => setAssistantPulseTarget(null), 2200);
    return () => window.clearTimeout(timer);
  }, [assistantPulseTarget]);

  const captureAssistantSnapshot = (): RecipeAssistantSnapshot => ({
    batchKg,
    flavorKey,
    recipeStyle,
    selectedArchetype,
    targetFatPct,
    targetFatOverride,
    targetPacOverride,
    targetPodOverride,
    targetSolidsOverride,
    sugarReduction,
    availableSugars,
    generatorKeyword,
    generatorMessage,
    language: language as AppLanguage,
    customIngredients: customIngredients.map((item) => ({
      id: item.id,
      grams_per_kg_mix: item.grams_per_kg_mix,
      enabled: item.enabled,
    })),
  });

  const restoreAssistantSnapshot = (snapshot: RecipeAssistantSnapshot) => {
    setBatchKg(snapshot.batchKg);
    setFlavorKey(snapshot.flavorKey as FlavorKey);
    setRecipeStyle(snapshot.recipeStyle);
    setSelectedArchetype(snapshot.selectedArchetype);
    setTargetFatPct(snapshot.targetFatPct);
    setTargetFatOverride(snapshot.targetFatOverride);
    setTargetPacOverride(snapshot.targetPacOverride);
    setTargetPodOverride(snapshot.targetPodOverride);
    setTargetSolidsOverride(snapshot.targetSolidsOverride);
    setSugarReduction(snapshot.sugarReduction);
    setAvailableSugars(snapshot.availableSugars as SugarOption[]);
    setGeneratorKeyword(snapshot.generatorKeyword);
    setGeneratorMessage(snapshot.generatorMessage);
    setCustomIngredients((current) =>
      current.map((item) => {
        const saved = snapshot.customIngredients.find((candidate) => candidate.id === item.id);

        return saved
          ? {
              ...item,
              grams_per_kg_mix: saved.grams_per_kg_mix,
              enabled: saved.enabled,
            }
          : item;
      })
    );

    if (snapshot.language !== language) {
      void setLanguage(snapshot.language);
    }
  };

  const pushAssistantChange = ({
    message,
    snapshot,
    pulseTarget,
  }: {
    message: string;
    snapshot: RecipeAssistantSnapshot;
    pulseTarget: AssistantPulseTarget;
  }) => {
    setAssistantChangeLog({ message, snapshot });
    setAssistantPulseTarget(pulseTarget);
  };

  const updateIngredientWeight = (name: string, deltaGrams: number) => {
    const nfdmIngredient =
      ingredients.find((item) => item.name === "Skim Milk Powder (NFDM)") ??
      ingredients.find((item) => item.name === "NFDM");

    if (!nfdmIngredient) {
      return;
    }

    if (!/nfdm|skim milk powder|non fat dry milk/i.test(name)) {
      return;
    }

    setCustomIngredients((current) => {
      const existing = current.find((item) => item.ingredient.name === nfdmIngredient.name);

      if (existing) {
        return current.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                enabled: true,
                grams_per_kg_mix: Math.max(0, item.grams_per_kg_mix + deltaGrams),
              }
            : item
        );
      }

      return [
        ...current,
        {
          id: `assistant-${nfdmIngredient.id}`,
          ingredient: nfdmIngredient,
          grams_per_kg_mix: Math.max(0, deltaGrams),
          enabled: true,
        },
      ];
    });
  };

  const updateTargetPhysics = (patch: {
    targetFatPct?: number;
    targetPac?: number;
    targetPodPct?: number;
    targetSolidsPct?: number;
    sugarReduction?: boolean;
  }) => {
    const nextPac = patch.targetPac ?? targetPacOverride ?? currentRecipe?.metrics.pac ?? pacRange.min + 5;

    if (nextPac > 300) {
      return {
        ok: false,
        warning: "Maestro, this will be too soft to scoop. Proceed anyway?",
      };
    }

    if (patch.targetFatPct !== undefined) {
      setTargetFatOverride(patch.targetFatPct);
      setTargetFatPct(patch.targetFatPct);
    }

    if (patch.targetPac !== undefined) {
      setTargetPacOverride(patch.targetPac);
    }

    if (patch.targetPodPct !== undefined) {
      setTargetPodOverride(patch.targetPodPct);
    }

    if (patch.targetSolidsPct !== undefined) {
      setTargetSolidsOverride(patch.targetSolidsPct);
    }

    if (patch.sugarReduction !== undefined) {
      setSugarReduction(patch.sugarReduction);
    }

    setAvailableSugars((current) => {
      const next = new Set(current);
      next.add("Dextrose");
      next.add("Polydextrose");
      next.add("Maltodextrin");
      return Array.from(next) as SugarOption[];
    });

    return { ok: true };
  };

  const scaleRecipeBatch = (input: { factor?: number; targetLiters?: number }) => {
    const currentVolume = currentRecipe?.estimatedVolumeLiters ?? 0;
    const currentWeightKg = currentRecipe ? currentRecipe.totalMixWeight / 1000 : batchKg;

    if (input.targetLiters && currentVolume > 0) {
      setBatchKg(clampBatchSize((currentWeightKg * input.targetLiters) / currentVolume, selectedEquipment));
      return;
    }

    if (input.factor) {
      setBatchKg(clampBatchSize(currentWeightKg * input.factor, selectedEquipment));
    }
  };

  const persistLanguagePreference = async (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);

    try {
      await syncLabSettings({
        display_type: displayType,
        equipment_id: selectedEquipmentId,
        lab_name: labName,
        logo_url: logoPreview,
        available_sugars: availableSugars,
        language: nextLanguage,
      });
    } catch {
      // Keep the UI responsive even if the settings table has not been migrated yet.
    }
  };

  const exportRecipe = async (recipe: RecipeBookEntry) => {
    setErrorMessage(null);
    setExportingRecipe(recipe);

    await new Promise((resolve) => window.setTimeout(resolve, 80));

    if (!exportRef.current) {
      setErrorMessage("The PDF sheet was not ready. Please try again.");
      setExportingRecipe(null);
      return;
    }

    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#f8f1e2",
        scale: 2,
      });
      const image = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const width = canvas.width * ratio;
      const height = canvas.height * ratio;
      const marginX = (pageWidth - width) / 2;

      pdf.addImage(image, "PNG", marginX, 10, width, height);
      pdf.save(`${recipe.recipeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
    } catch {
      setErrorMessage("PDF export failed. Try again after the invoice finishes rendering.");
    } finally {
      setExportingRecipe(null);
    }
  };

  const handleCustomIngredientSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!customForm.name.trim()) {
      setErrorMessage("Give the custom ingredient a name before saving it.");
      return;
    }

    const ingredient = makeIngredientFromForm(customForm);

    setCustomIngredients((current) => [
      ...current,
      {
        id: ingredient.id,
        ingredient,
        grams_per_kg_mix: customForm.gramsPerKgMix,
        enabled: true,
      },
    ]);
    setCustomForm(defaultCustomIngredientForm);
    setCustomModalOpen(false);
  };

  const availableStabilizers = stabilizers.filter(
    (item) => item.process_type === "Cold" || heatingCapable
  );

  return (
    <RecipeProvider
      value={{
        assistantContext: {
          ingredients: [...ingredients, ...customIngredients.map((item) => item.ingredient)],
          selectedEquipment,
          displayType,
          availableSugars,
          pantryStock,
          currentRecipe: currentRecipe
            ? {
                title: currentRecipe.title,
                metrics: currentRecipe.metrics,
                targetProfile: currentRecipe.targetProfile,
                estimatedVolumeLiters: currentRecipe.estimatedVolumeLiters,
                totalMixWeight: currentRecipe.totalMixWeight,
              }
            : null,
        },
        currentTargetProfile: recipeStyle,
        currentTargetPodPct: targetPodOverride ?? currentRecipe?.metrics.podPct ?? 16,
        currentTargetSolidsPct: targetSolidsOverride ?? currentRecipe?.metrics.solidsPct ?? 36,
        batchKg,
        language: language as AppLanguage,
        updateIngredientWeight,
        updateTargetPhysics,
        scaleBatch: scaleRecipeBatch,
        loadDraft: handleAssistantLoadIntoLab,
        setLanguagePreference: persistLanguagePreference,
        captureSnapshot: captureAssistantSnapshot,
        restoreSnapshot: restoreAssistantSnapshot,
        pushAssistantChange,
      }}
    >
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {assistantChangeLog ? (
          <div className="fixed right-4 top-4 z-50 max-w-sm rounded-[22px] border border-[rgba(212,175,55,0.24)] bg-[rgba(26,22,20,0.94)] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            <p className="text-sm text-[var(--text-primary)]">{assistantChangeLog.message}</p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssistantChangeLog(null)}
                className="rounded-full border border-[var(--accent-border)] px-3 py-1 text-xs text-[var(--text-muted)]"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  restoreAssistantSnapshot(assistantChangeLog.snapshot);
                  setAssistantChangeLog(null);
                }}
                className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[#1a1614]"
              >
                Undo
              </button>
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">
              Gelato Miracoli
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Fellini-ready balancing, pantry intelligence, and multilingual production export.
            </p>
          </div>
          <LanguageToggle />
        </div>
        <section className="luxury-card relative overflow-hidden rounded-[34px] p-6 sm:p-8">
          <div className="absolute inset-y-0 right-0 hidden w-[46%] lg:block">
            <Image
              src="/gelato-swirl-hero.svg"
              alt="Dark chocolate gelato swirls"
              fill
              priority
              className="object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,16,14,0.96)_0%,rgba(20,16,14,0.88)_45%,rgba(20,16,14,0.16)_100%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-5">
              <span className="gold-chip inline-flex w-fit rounded-full px-3 py-1 text-xs uppercase tracking-[0.28em]">
                Luxury Gelato OS
              </span>
              <div className="space-y-3">
                <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
                  Artisan Soul. Digital Precision.
                </h1>
                <p className="max-w-xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
                  A high-end gelato balancing studio inspired by premium kitchen hardware. Map the
                  machine, tune the display environment, and rebalance every batch with cost, stock,
                  and yield in view.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#lab"
                  className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b1612] transition hover:brightness-105"
                >
                  Open The Lab
                </a>
                <Link
                  href="/pantry"
                  className="rounded-full border border-[var(--accent-border)] px-5 py-3 text-sm transition hover:border-[rgba(212,175,55,0.24)] hover:bg-[rgba(212,175,55,0.08)]"
                >
                  Open Pantry
                </Link>
                <button
                  type="button"
                  onClick={() => setLibraryOpen(true)}
                  className="rounded-full border border-[var(--accent-border)] px-5 py-3 text-sm transition hover:border-[rgba(212,175,55,0.24)] hover:bg-[rgba(212,175,55,0.08)]"
                >
                  Explore The Ingredient Library
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="PAC Window" value={`${pacRange.min}-${pacRange.max}`} />
                <MetricCard
                  label="Batch Freezer"
                  value={selectedEquipment.brand}
                  detail={selectedEquipment.model}
                />
                <MetricCard
                  label="Heating"
                  value={heatingCapable ? "Hot + Cold" : "Cold Only"}
                  detail={`Data source: ${dataSource}`}
                />
              </div>
            </div>
            <div className="relative min-h-[260px] lg:hidden">
              <Image
                src="/gelato-swirl-hero.svg"
                alt="Dark chocolate gelato swirls"
                fill
                className="rounded-[28px] object-cover"
              />
            </div>
          </div>
        </section>

        <MiracoliDashboard
          recipeCount={recipeBook.length}
          selectedEquipmentLabel={`${selectedEquipment.brand} ${selectedEquipment.model}`}
          machineType={selectedEquipment.machine_type}
          displayType={displayType}
          dataSource={dataSource}
          recipeStartMode={recipeStartMode}
          onRecipeStartModeChange={setRecipeStartMode}
        />

        <LabOnboardingSetup
          equipment={equipment}
          selectedEquipmentId={selectedEquipmentId}
          displayType={displayType}
          quickStartItems={quickStartItems}
          saveState={labSetupSaveState}
          onSelectBrand={handleSelectEquipmentBrand}
          onSelectEquipment={(equipmentId) => {
            setSelectedEquipmentId(equipmentId);
            setLabSetupSaveState("idle");
          }}
          onSelectDisplayType={(nextDisplayType) => {
            setDisplayType(nextDisplayType);
            setLabSetupSaveState("idle");
          }}
          onToggleQuickStart={handleQuickStartToggle}
          onSave={handlePersistLabSetup}
        />

        <section className="grid gap-5 lg:grid-cols-3">
          <article className="luxury-card rounded-[28px] p-5">
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
              1. Brand Identity
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Define the marque</h2>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Lab Name
                </span>
                <input
                  value={labName}
                  onChange={(event) => setLabName(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none transition focus:border-[rgba(212,175,55,0.34)]"
                />
              </label>
              <label className="block rounded-[24px] border border-dashed border-[var(--accent-border)] bg-black/10 p-4">
                <span className="mb-3 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Upload Logo
                </span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
                {logoPreview ? (
                  <div className="mt-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-[var(--accent-border)] bg-white/70">
                    <Image
                      src={logoPreview}
                      alt="Lab logo preview"
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
              </label>
              <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      Profile Setting
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      Developer-only publishing path for the Master Vault.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setProfile((current) => ({
                        ...current,
                        isMasterAdmin: !current.isMasterAdmin,
                      }))
                    }
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      profile.isMasterAdmin
                        ? "border-[rgba(212,175,55,0.34)] bg-[rgba(212,175,55,0.12)]"
                        : "border-[var(--accent-border)]"
                    }`}
                  >
                    Master Admin {profile.isMasterAdmin ? "On" : "Off"}
                  </button>
                </div>
              </div>
            </div>
          </article>

          <article className="luxury-card rounded-[28px] p-5">
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">2. The Lab</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Map the machine</h2>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Batch Freezer
                </span>
                <select
                  value={selectedEquipmentId}
                  onChange={(event) => setSelectedEquipmentId(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none transition focus:border-[rgba(212,175,55,0.34)]"
                >
                  {equipment.map((item) => (
                    <option key={item.id} value={item.id} className="bg-[#1a1614]">
                      {item.brand} {item.model}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                {(["Standard Case", "Pozzetti"] as const).map((option) => (
                  <ToggleChip
                    key={option}
                    selected={displayType === option}
                    label={option}
                    onClick={() => setDisplayType(option)}
                  />
                ))}
              </div>
              <div className="rounded-[22px] border border-[var(--accent-border)] bg-black/10 p-4 text-sm text-[var(--text-muted)]">
                PAC target range shifts to {pacRange.min}-{pacRange.max} for {displayType}.
                {heatingCapable
                  ? " Hot-process stabilizers stay available on this machine."
                  : " Hot-process stabilizers are disabled because this freezer does not heat."}
              </div>
            </div>
          </article>

          <article className="luxury-card rounded-[28px] p-5">
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
              3. Ingredient Access
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Set the constraints</h2>
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {sugarOptions.map((sugar) => (
                  <ToggleChip
                    key={sugar}
                    selected={availableSugars.includes(sugar)}
                    label={sugar}
                    onClick={() => toggleSugar(sugar)}
                  />
                ))}
              </div>
              <div className="rounded-[22px] border border-[var(--accent-border)] bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Pantry status
                </p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  NFDM is currently {nfdmInStock ? "in stock" : "out of stock"}.
                  {!nfdmInStock
                    ? " The solver will concentrate the dairy base to recover MSNF."
                    : " Standard three-ingredient dairy balancing is active."}
                </p>
                <Link
                  href="/pantry"
                  className="mt-4 inline-flex rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm"
                >
                  Manage Pantry
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setCustomModalOpen(true)}
                className="w-full rounded-full border border-[var(--accent-border)] px-4 py-3 text-sm transition hover:border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.08)]"
              >
                Add Custom Ingredient
              </button>
              <p className="text-sm text-[var(--text-muted)]">
                Proxy mode lets you enter fat, sugars, and protein per 100g and maps PAC and POD
                from standard sugar coefficients when technical specs are missing.
              </p>
            </div>
          </article>
        </section>

        <section id="lab" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div
            className={`luxury-card rounded-[30px] p-6 sm:p-7 ${
              textureAlert ? "miracoli-danger-pulse" : ""
            }`}
          >
            <div className="mb-5 rounded-[24px] border border-[var(--accent-border)] bg-black/10 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Pre-Flight
                </p>
                {preflightStatus.equipmentReady &&
                preflightStatus.environmentReady &&
                preflightStatus.pantryReady ? null : (
                  <a
                    href="#lab-setup"
                    className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-xs uppercase tracking-[0.18em]"
                  >
                    Calibrate Now
                  </a>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-[rgba(73,191,115,0.28)] bg-[rgba(73,191,115,0.1)] px-3 py-1 text-xs">
                  Equipment: {selectedEquipment.brand} {selectedEquipment.model}{" "}
                  {preflightStatus.equipmentReady ? "(Green Check)" : "(Missing)"}
                </span>
                <span className="rounded-full border border-[rgba(97,168,255,0.28)] bg-[rgba(97,168,255,0.1)] px-3 py-1 text-xs">
                  Environment: {displayType} {preflightStatus.environmentReady ? "(Blue Check)" : "(Missing)"}
                </span>
                <span className="rounded-full border border-[rgba(212,175,55,0.28)] bg-[rgba(212,175,55,0.1)] px-3 py-1 text-xs">
                  Pantry: {verifiedIngredientCount} Verified Ingredients Loaded{" "}
                  {preflightStatus.pantryReady ? "(Gold Check)" : "(Missing)"}
                </span>
              </div>
            </div>
            <div className="mb-5">
              <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
                The Lab
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                Interactive rebalancer
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
                {recipeStartMode === "precision"
                  ? "Precision mode expects verified sheets, scanned labels, or remote tech-sheet matches so the base can honor exact product physics."
                  : "Inspiration mode starts from pantry-backed archetypes. Dark chocolate will query Cocoa Powder and 70% Dark Chocolate automatically when no branded paste is selected."}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
                Active goal post: {activeArchetype.label}
              </p>
            </div>

            <div className="mb-5">
              <RecipeTypeSelector
                selected={selectedArchetype}
                onSelect={applyArchetypeSelection}
              />
              {recipeStartMode === "inspiration" ? (
                <>
                <GeneratorInput
                  value={generatorKeyword}
                  suggestion={generatorSuggestion}
                  busy={generatorBusy}
                  onChange={setGeneratorKeyword}
                  onGenerate={handleGenerateRecipe}
                />
                {generatorMessage ? (
                  <p className="mt-3 text-sm text-[var(--accent)] transition">
                    {generatorMessage}
                  </p>
                ) : null}
                </>
              ) : generatorMessage ? (
                <p className="mt-3 text-sm text-[var(--accent)] transition">{generatorMessage}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Flavor Profile
                </span>
                <select
                  value={flavorKey}
                  onChange={(event) => {
                    const nextFlavor = event.target.value as FlavorKey;

                    setFlavorKey(nextFlavor);
                    setSelectedArchetype(inferArchetypeFromFlavorKey(nextFlavor));
                    setTargetFatOverride(null);
                    setTargetPacOverride(null);
                    setTargetPodOverride(null);
                    setTargetSolidsOverride(null);
                    setRecipeStyle(nextFlavor === "strawberry" ? "Sorbet" : "Gelato");
                    setBaseType(nextFlavor === "strawberry" ? "Cold" : baseType);
                    setGeneratorMessage(null);
                  }}
                  className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none transition focus:border-[rgba(212,175,55,0.34)]"
                >
                  {Object.values(flavorProfiles).map((profile) => (
                    <option key={profile.key} value={profile.key} className="bg-[#1a1614]">
                      {profile.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Process
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(["Hot", "Cold"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setBaseType(option)}
                      disabled={option === "Hot" && !heatingCapable}
                      className={`rounded-2xl border px-4 py-3 text-sm transition ${
                        baseType === option
                          ? "border-[rgba(212,175,55,0.34)] bg-[rgba(212,175,55,0.12)]"
                          : "border-[var(--accent-border)] bg-black/10"
                      } ${option === "Hot" && !heatingCapable ? "cursor-not-allowed opacity-45" : ""}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <RecipeIngredientRow
                name={flavorRow.name}
                value={flavorIntensity}
                min={60}
                max={160}
                step={5}
                suffix="%"
                dosageGuidelinePerKg={flavorRow.recommendedGramsPerKg}
                alerted={textureAlert}
                highlighted={assistantPulseTarget === "flavor"}
                onChange={setFlavorIntensity}
              />
              <div className="rounded-[22px] border border-[var(--accent-border)] bg-black/10 px-4 py-3 text-sm text-[var(--text-muted)]">
                Active dose: {formatMetric(flavorRow.gramsPerKg, "g")} per kg of base.
                {textureAlert
                  ? " Texture is running hot; the border is pulsing because fat or solids crossed the alert ceiling."
                  : " Slide intensity and let milk, cream, and sugars rebalance around the new flavor load."}
              </div>
              <SliderRow
                label="Fat Content"
                value={targetFatPct}
                min={fatSliderBounds.min}
                max={fatSliderBounds.max}
                step={fatSliderBounds.step}
                suffix="%"
                highlighted={false}
                onChange={(value) => {
                  setTargetFatOverride(value);
                  setTargetFatPct(value);
                }}
                formatMetric={formatMetric}
              />
              <SliderRow
                label="Sweetness / POD"
                value={targetPodOverride ?? currentRecipe?.metrics.podPct ?? 16}
                min={11}
                max={20}
                step={0.1}
                suffix="%"
                highlighted={assistantPulseTarget === "pod"}
                onChange={(value) => setTargetPodOverride(value)}
                formatMetric={formatMetric}
              />
              <SliderRow
                label="Total Solids"
                value={targetSolidsOverride ?? currentRecipe?.metrics.solidsPct ?? 36}
                min={31}
                max={40}
                step={0.1}
                suffix="%"
                highlighted={assistantPulseTarget === "solids"}
                onChange={(value) => setTargetSolidsOverride(value)}
                formatMetric={formatMetric}
              />
              <SliderRow
                label="Target Batch"
                value={batchKg}
                min={0.5}
                max={selectedEquipment.max_batch_kg}
                step={0.1}
                suffix="kg"
                highlighted={assistantPulseTarget === "batch"}
                onChange={(value) => setBatchKg(clampBatchSize(value, selectedEquipment))}
                formatMetric={formatMetric}
              />
              <SliderRow
                label="Overrun"
                value={overrunPct}
                min={10}
                max={45}
                step={1}
                suffix="%"
                onChange={setOverrunPct}
                formatMetric={formatMetric}
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Retail Price / Liter
                </span>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={pricing.retailPricePerLiter}
                  onChange={(event) =>
                    setPricing({ retailPricePerLiter: Number(event.target.value) || 1 })
                  }
                  className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none transition focus:border-[rgba(212,175,55,0.34)]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Target Margin %
                </span>
                <input
                  type="number"
                  min={10}
                  max={95}
                  step={1}
                  value={pricing.targetMarginPct}
                  onChange={(event) =>
                    setPricing({ targetMarginPct: Number(event.target.value) || 75 })
                  }
                  className="w-full rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none transition focus:border-[rgba(212,175,55,0.34)]"
                />
              </label>
              <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Allowed stabilizers
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {availableStabilizers.map((item) => (
                    <span key={item.id} className="gold-chip rounded-full px-3 py-1">
                      {item.brand_name} {item.process_type}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
              <div className="flex flex-wrap gap-2">
                <ToggleChip
                  selected={sugarReduction}
                  label="Sugar Reduction"
                  onClick={() => setSugarReduction((current) => !current)}
                />
              </div>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                When active, the solver lowers POD by about 18% and biases toward Dextrose and
                Polydextrose to preserve PAC with less perceived sweetness.
              </p>
            </div>

            <div className="mt-5 rounded-[26px] border border-[var(--accent-border)] bg-black/10 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                    Custom inclusions
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Set grams per kg mix for any custom solids you want fixed in the rebalance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(true)}
                  className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm transition hover:border-[rgba(212,175,55,0.3)]"
                >
                  Add
                </button>
              </div>
              <div className="space-y-3">
                {customIngredients.length ? (
                  customIngredients.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-3 rounded-[20px] border border-[var(--accent-border)] bg-[rgba(255,255,255,0.02)] p-3 sm:grid-cols-[1.2fr_0.7fr_auto]"
                    >
                      <div>
                        <p className="font-medium">{item.ingredient.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Priority {item.ingredient.data_priority.replaceAll("_", " ")} | PAC{" "}
                          {formatMetric(item.ingredient.pac_value)} / POD{" "}
                          {formatMetric(item.ingredient.pod_value)}
                        </p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={item.grams_per_kg_mix}
                        onChange={(event) =>
                          setCustomIngredients((current) =>
                            current.map((candidate) =>
                              candidate.id === item.id
                                ? { ...candidate, grams_per_kg_mix: Number(event.target.value) || 0 }
                                : candidate
                            )
                          )
                        }
                        className="rounded-2xl border border-[var(--accent-border)] bg-black/10 px-4 py-3 outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCustomIngredients((current) =>
                              current.map((candidate) =>
                                candidate.id === item.id
                                  ? { ...candidate, enabled: !candidate.enabled }
                                  : candidate
                              )
                            )
                          }
                          className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em] ${
                            item.enabled
                              ? "border-[rgba(212,175,55,0.34)] bg-[rgba(212,175,55,0.12)]"
                              : "border-[var(--accent-border)]"
                          }`}
                        >
                          {item.enabled ? "On" : "Off"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomIngredients((current) =>
                              current.filter((candidate) => candidate.id !== item.id)
                            )
                          }
                          className="rounded-full border border-[var(--accent-border)] px-3 py-2 text-xs uppercase tracking-[0.18em]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    No custom ingredients yet. Use proxy mode when you only know macro grams per
                    100g.
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="luxury-card rounded-[30px] p-6 sm:p-7">
            <div className="mb-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
                    The Result
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                    Luxury invoice output
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{recipeName}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ToggleChip
                    selected={outputView === "Weight"}
                    label="Weight View"
                    onClick={() => setOutputView("Weight")}
                  />
                  <ToggleChip
                    selected={outputView === "Liters"}
                    label="Liters View"
                    onClick={() => setOutputView("Liters")}
                  />
                </div>
              </div>
            </div>

            {currentRecipe ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {outputView === "Weight" ? (
                    <>
                      <MetricCard
                        label="Production Column"
                        value={formatMetric(currentRecipe.totalMixWeight, "g")}
                      />
                      <MetricCard
                        label="Expected Yield"
                        value={formatMetric(currentRecipe.estimatedVolumeLiters, "L")}
                        detail={`Density ${formatMetric(currentRecipe.metrics.densityKgPerL)} kg/L`}
                      />
                    </>
                  ) : (
                    <>
                      <MetricCard
                        label="Expected Yield"
                        value={formatMetric(currentRecipe.estimatedVolumeLiters, "L")}
                        detail={`${formatMetric(currentRecipe.totalMixWeight / 1000, "kg")} mix weight`}
                      />
                      <MetricCard
                        label="Expansion Factor"
                        value={formatMetric(expansionFactor, "x")}
                        detail={`${formatMetric(overrunPct, "%")} live overrun setting`}
                      />
                    </>
                  )}
                  <MetricCard
                    label="PAC"
                    value={formatMetric(currentRecipe.metrics.pac)}
                    detail={`${currentRecipe.metrics.pacRange.min}-${currentRecipe.metrics.pacRange.max} for ${displayType}`}
                  />
                  <MetricCard
                    label="Margin"
                    value={formatMetric(currentRecipe.metrics.estimatedMarginPct, "%")}
                    detail={`At $${formatMetric(pricing.retailPricePerLiter)} per liter`}
                  />
                  <MetricCard
                    label="Suggested Retail"
                    value={`${pricing.currency === "EUR" ? "EUR " : "$"}${formatMetric(currentRecipe.metrics.suggestedRetailPerLiter)}`}
                    detail={`${formatMetric(pricing.targetMarginPct, "%")} target margin`}
                  />
                </div>

                <div className="mt-5 rounded-[28px] border border-[var(--accent-border)] bg-[linear-gradient(180deg,rgba(212,175,55,0.08),transparent)] p-5">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                        {outputView === "Weight" ? "Ingredient Invoice" : "Yield Invoice"}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                        {currentRecipe.title}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        {outputView === "Weight"
                          ? "Production weights remain the source of truth for the batch sheet."
                          : `Liters view uses the active ${formatMetric(expansionFactor, "x")} expansion factor from the selected equipment.`}
                      </p>
                    </div>
                    <span className="gold-chip rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
                      {currentRecipe.baseType}
                    </span>
                  </div>

                  <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 px-4">
                    {currentRecipe.ingredients.map((ingredient) => (
                      <InvoiceRow
                        key={ingredient.name}
                        label={translateIngredientLabel(ingredient.name, language)}
                        value={`${formatMetric(ingredient.grams)}g  |  ${formatMetric(
                          ingredient.percentage,
                          "%"
                        )}`}
                      />
                    ))}
                    <InvoiceRow
                      label="Total Batch Cost"
                      value={`${pricing.currency === "EUR" ? "EUR " : "$"}${formatMetric(currentRecipe.metrics.totalBatchCost)}`}
                      emphasized
                    />
                    <InvoiceRow
                      label="Cost / Kg"
                      value={`${pricing.currency === "EUR" ? "EUR " : "$"}${formatMetric(currentRecipe.metrics.costPerKg)}`}
                      emphasized
                    />
                    <InvoiceRow
                      label="Cost / Liter"
                      value={`${pricing.currency === "EUR" ? "EUR " : "$"}${formatMetric(currentRecipe.metrics.costPerLiter)}`}
                      emphasized
                    />
                    <InvoiceRow
                      label="Estimated Margin"
                      value={formatMetric(currentRecipe.metrics.estimatedMarginPct, "%")}
                      emphasized
                    />
                    <InvoiceRow
                      label="Suggested Pint"
                      value={`${pricing.currency === "EUR" ? "EUR " : "$"}${formatMetric(currentRecipe.metrics.suggestedRetailPerPint)}`}
                      emphasized
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <MetricCard label="Fat" value={formatMetric(currentRecipe.metrics.fatPct, "%")} />
                  <MetricCard
                    label="Sugar"
                    value={formatMetric(currentRecipe.metrics.sugarPct, "%")}
                  />
                  <MetricCard label="POD" value={formatMetric(currentRecipe.metrics.podPct, "%")} />
                  <MetricCard
                    label="Solids"
                    value={formatMetric(currentRecipe.metrics.solidsPct, "%")}
                  />
                </div>

                {currentRecipe.warnings.length ? (
                  <div className="mt-5 space-y-3">
                    {currentRecipe.warnings.map((warning) => (
                      <div
                        key={`${warning.title}-${warning.message}`}
                        className="rounded-[24px] border border-[rgba(255,140,111,0.28)] bg-[rgba(255,140,111,0.08)] p-4"
                      >
                        <p className="text-xs uppercase tracking-[0.22em] text-[var(--danger)]">
                          {warning.title}
                        </p>
                        <p className="mt-2 text-sm text-[var(--foreground)]">{warning.message}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                      Logic Priority
                    </p>
                    <p className="mt-3 text-sm text-[var(--text-muted)]">
                      Verified {currentRecipe.logicPriority.verifiedLabDataCount} | Proxy{" "}
                      {currentRecipe.logicPriority.proxyModeCount} | Industry{" "}
                      {currentRecipe.logicPriority.industryAverageCount}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                      Solver Notes
                    </p>
                    <p className="mt-3 text-sm text-[var(--text-muted)]">
                      {currentRecipe.fixedIngredientNotes[0] ?? "No fixed ingredient note."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSaveRecipe}
                    className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b1612] transition hover:brightness-105"
                  >
                    Save To Recipe Book
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportRecipe({
                        ...currentRecipe,
                        id: "preview",
                        recipeName,
                        createdAt: new Date().toISOString(),
                      })
                    }
                    className="rounded-full border border-[var(--accent-border)] px-5 py-3 text-sm transition hover:border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.08)]"
                  >
                    Export PDF
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-[rgba(255,140,111,0.28)] bg-[rgba(255,140,111,0.08)] p-5 text-sm text-[var(--danger)]">
                {currentRecipeError}
              </div>
            )}
          </div>
        </section>

        <RecipeBookSection
          recipes={filteredRecipes}
          search={search}
          onSearchChange={setSearch}
          onExport={exportRecipe}
          onDelete={(id) => setRecipeBook((current) => current.filter((entry) => entry.id !== id))}
          onScale={handleScaleRecipe}
          formatMetric={formatMetric}
          dateFormatter={dateFormatter}
        />

        {errorMessage ? (
          <div className="rounded-2xl border border-[rgba(255,140,111,0.28)] bg-[rgba(255,140,111,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
            {errorMessage}
          </div>
        ) : null}
      </div>

      <LibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        ingredients={ingredients}
        stabilizers={stabilizers}
        selectedEquipment={selectedEquipment}
        formatMetric={formatMetric}
      />
      <CustomIngredientModal
        open={customModalOpen}
        form={customForm}
        setForm={setCustomForm}
        onClose={() => setCustomModalOpen(false)}
        onSubmit={handleCustomIngredientSubmit}
      />
      <ChefCommandBar proactiveAlert={proactiveCopilotAlert} />

      <div className="pointer-events-none fixed left-[-9999px] top-0 z-50 w-[900px]" aria-hidden="true">
        {exportingRecipe ? (
          <div ref={exportRef}>
            <RecipePdfSheet
              recipe={exportingRecipe}
              labName={labName}
              logoUrl={logoPreview}
              activeLanguage={language as AppLanguage}
              dateFormatter={dateFormatter}
              formatMetric={formatMetric}
            />
          </div>
        ) : null}
      </div>
    </main>
    </RecipeProvider>
  );
}
