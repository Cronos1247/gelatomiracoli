"use client";

import { createContext, useContext } from "react";
import type { TargetProfileKey, ArchetypeKey } from "@/lib/balance-gelato";
import type { ChefAssistantContext, ChefAssistantRecipeDraft } from "@/lib/chef-assistant/types";
import type { AppLanguage } from "@/lib/i18n";

export type AssistantPulseTarget = "pod" | "solids" | "batch" | "flavor" | null;

export type RecipeAssistantSnapshot = {
  batchKg: number;
  flavorKey: string;
  recipeStyle: TargetProfileKey;
  selectedArchetype: ArchetypeKey;
  targetFatPct: number;
  targetFatOverride: number | null;
  targetPacOverride: number | null;
  targetPodOverride: number | null;
  targetSolidsOverride: number | null;
  sugarReduction: boolean;
  availableSugars: string[];
  generatorKeyword: string;
  generatorMessage: string | null;
  language: AppLanguage;
  customIngredients: Array<{
    id: string;
    grams_per_kg_mix: number;
    enabled: boolean;
  }>;
};

export type RecipeContextValue = {
  assistantContext: ChefAssistantContext;
  currentTargetProfile: TargetProfileKey;
  currentTargetPodPct: number;
  currentTargetSolidsPct: number;
  batchKg: number;
  language: AppLanguage;
  updateIngredientWeight: (name: string, deltaGrams: number) => void;
  updateTargetPhysics: (patch: {
    targetFatPct?: number;
    targetPac?: number;
    targetPodPct?: number;
    targetSolidsPct?: number;
    sugarReduction?: boolean;
  }) => { ok: boolean; warning?: string };
  scaleBatch: (input: { factor?: number; targetLiters?: number }) => void;
  loadDraft: (draft: ChefAssistantRecipeDraft) => void;
  setLanguagePreference: (language: AppLanguage) => Promise<void> | void;
  captureSnapshot: () => RecipeAssistantSnapshot;
  restoreSnapshot: (snapshot: RecipeAssistantSnapshot) => void;
  pushAssistantChange: (change: {
    message: string;
    snapshot: RecipeAssistantSnapshot;
    pulseTarget: AssistantPulseTarget;
  }) => void;
};

const RecipeContext = createContext<RecipeContextValue | null>(null);

export function RecipeProvider({
  value,
  children,
}: {
  value: RecipeContextValue;
  children: React.ReactNode;
}) {
  return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>;
}

export function useRecipeContext() {
  const context = useContext(RecipeContext);

  if (!context) {
    throw new Error("useRecipeContext must be used inside RecipeProvider.");
  }

  return context;
}
