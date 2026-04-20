import type { ArchetypeKey, BalancedRecipe, TargetProfileKey } from "@/lib/balance-gelato";
import type { BaseType, DisplayType, Equipment, FlavorKey, Ingredient, SugarOption } from "@/lib/default-data";

export type ChefAssistantRecipeDraft = {
  keyword: string;
  flavorKey: FlavorKey;
  recipeStyle: TargetProfileKey;
  archetypeKey: ArchetypeKey;
  targetFatPct: number;
  targetPac: number;
  targetPodPct: number;
  targetSolidsPct: number;
  baseType: BaseType;
  note: string;
};

export type ChefAssistantAction =
  | {
      type: "load-recipe";
      recipeDraft: ChefAssistantRecipeDraft;
    }
  | {
      type: "reduce-sweetness";
      targetPodPct?: number;
      note: string;
    };

export type ChefAssistantCard =
  | {
      id: string;
      type: "recipe-preview";
      title: string;
      subtitle: string;
      bullets: string[];
      ctaLabel: string;
      recipeDraft: ChefAssistantRecipeDraft;
      action?: ChefAssistantAction;
    }
  | {
      id: string;
      type: "diagnostic";
      title: string;
      subtitle: string;
      bullets: string[];
      ctaLabel?: string;
      action?: ChefAssistantAction;
    }
  | {
      id: string;
      type: "note";
      title: string;
      subtitle: string;
      bullets: string[];
      ctaLabel?: string;
      action?: ChefAssistantAction;
    };

export type ChefAssistantResponse = {
  summary: string;
  cards: ChefAssistantCard[];
};

export type ChefAssistantContext = {
  ingredients: Ingredient[];
  selectedEquipment: Equipment;
  displayType: DisplayType;
  availableSugars: SugarOption[];
  pantryStock: Partial<Record<string, boolean>>;
  currentRecipe?: Pick<
    BalancedRecipe,
    "title" | "metrics" | "targetProfile" | "estimatedVolumeLiters" | "totalMixWeight"
  > | null;
};
