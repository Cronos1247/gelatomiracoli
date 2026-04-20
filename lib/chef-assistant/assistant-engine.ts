import { ARCHETYPES, type ArchetypeKey } from "@/lib/balance-gelato";
import { displayTypePacRanges } from "@/lib/default-data";
import { generateRecipeFromKeyword } from "@/lib/maestro-generator";
import { chefAssistantPrompt } from "@/lib/chef-assistant/chefAssistantPrompt";
import type {
  ChefAssistantCard,
  ChefAssistantContext,
  ChefAssistantRecipeDraft,
  ChefAssistantResponse,
} from "@/lib/chef-assistant/types";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9%]+/g, " ").trim();
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

function inferKeyword(message: string) {
  const normalized = normalize(message);

  if (/(hazelnut|nocciola|gianduja)/.test(normalized)) {
    return "Hazelnut";
  }

  if (/(pistachio|pistacchio)/.test(normalized)) {
    return "Pistachio";
  }

  if (/(strawberry|mango|lemon|fruit|sorbet)/.test(normalized)) {
    if (normalized.includes("mango")) {
      return "Mango";
    }

    if (normalized.includes("lemon")) {
      return "Lemon";
    }

    return "Strawberry";
  }

  if (/(vanilla|custard|crema)/.test(normalized)) {
    return "Vanilla";
  }

  if (/(chocolate|cocoa|fondente)/.test(normalized)) {
    return "Chocolate";
  }

  return null;
}

function buildRecipeCard(message: string, context: ChefAssistantContext): ChefAssistantResponse | null {
  const keyword = inferKeyword(message);

  if (!keyword) {
    return null;
  }

  const draft = generateRecipeFromKeyword(keyword, 1, {
    ingredientLibrary: context.ingredients,
    pantryStock: context.pantryStock,
    displayType: context.displayType,
    availableSugars: context.availableSugars,
    equipment: context.selectedEquipment,
  });
  const archetypeKey = mapGeneratorArchetype(draft.archetype);
  const recipeDraft: ChefAssistantRecipeDraft = {
    keyword,
    flavorKey: draft.flavorKey,
    recipeStyle: draft.recipeStyle,
    archetypeKey,
    targetFatPct: draft.targetFatPct,
    targetPac: draft.targetPac,
    targetPodPct: draft.targetPodPct,
    targetSolidsPct: draft.targetSolidsPct,
    baseType: draft.recipe.baseType,
    note:
      draft.disclaimer ??
      `Using ${ARCHETYPES[archetypeKey].label} with ${draft.matchedIngredients.length ? draft.matchedIngredients.map((item) => item.name).join(", ") : "house pantry defaults"}.`,
  };

  const card: ChefAssistantCard = {
    id: `recipe-${Date.now()}`,
    type: "recipe-preview",
    title: `${keyword} draft ready`,
    subtitle: `Archetype: ${ARCHETYPES[archetypeKey].label}`,
    bullets: [
      `Target fat ${draft.targetFatPct}% | PAC ${draft.targetPac} | POD ${draft.targetPodPct}`,
      `Expected yield ${draft.recipe.estimatedVolumeLiters.toFixed(2)} L from ${(
        draft.recipe.totalMixWeight / 1000
      ).toFixed(2)} kg mix`,
      draft.disclaimer ??
        (draft.matchedIngredients.length
          ? `Pantry match: ${draft.matchedIngredients.map((item) => item.name).join(", ")}`
          : "No exact verified sheet found, so the Maestro used house generic pantry physics."),
    ],
    ctaLabel: "Load into Lab",
    recipeDraft,
    action: {
      type: "load-recipe",
      recipeDraft,
    },
  };

  return {
    summary: `The Maestro drafted a ${keyword.toLowerCase()} balance and left it on the bench.`,
    cards: [card],
  };
}

function buildHardnessDiagnostic(context: ChefAssistantContext): ChefAssistantResponse | null {
  const recipe = context.currentRecipe;

  if (!recipe) {
    return {
      summary: "I need the active lab formula before I can diagnose hardness.",
      cards: [
        {
          id: "note-no-recipe",
          type: "note",
          title: "No active recipe loaded",
          subtitle: "Open or generate a recipe first.",
          bullets: [
            "The hardness diagnostic needs the current PAC, POD, and solids.",
            "Once the recipe is in the lab, I can suggest a dextrose/sucrose adjustment immediately.",
          ],
        },
      ],
    };
  }

  const pacWindow = displayTypePacRanges[context.displayType];
  const pac = recipe.metrics.pac;
  const lowBy = Math.max(pacWindow.min - pac, 0);
  const dextroseDelta = lowBy > 0 ? 15 : 0;
  const sucroseDelta = lowBy > 0 ? -15 : 0;

  return {
    summary:
      lowBy > 0
        ? "The mix is running colder and harder than the vessel wants."
        : "The PAC looks serviceable; the hardness may be coming from solids or freezer temperature instead.",
    cards: [
      {
        id: "diag-hard",
        type: "diagnostic",
        title: lowBy > 0 ? "PAC is below the service window" : "PAC is in range",
        subtitle: `${context.displayType} wants ${pacWindow.min}-${pacWindow.max}; the current recipe is at ${pac.toFixed(0)}.`,
        bullets:
          lowBy > 0
            ? [
                `Add ${dextroseDelta} g Dextrose and reduce Sucrose by ${Math.abs(sucroseDelta)} g to lift PAC without bloating sweetness.`,
                `Current solids are ${recipe.metrics.solidsPct.toFixed(1)}%; keep an eye on body if the spoon still feels tight.`,
                `If the case is running below target temperature, check that before chasing more sugar.`,
              ]
            : [
                `PAC is at ${pac.toFixed(0)}, so I would inspect total solids (${recipe.metrics.solidsPct.toFixed(1)}%) and holding temperature next.`,
              "If the spoon still feels rigid, trim solids or bump overrun before making the mix sweeter.",
              ],
        ctaLabel: lowBy > 0 ? "Apply Less-Sweet Fix" : undefined,
        action: lowBy > 0
          ? {
              type: "reduce-sweetness",
              targetPodPct: Math.max((recipe.metrics.podPct ?? 16) - 2, 11),
              note: `Lift PAC with Dextrose and body sugars while trimming sweetness for the ${context.displayType} case.`,
            }
          : undefined,
      },
    ],
  };
}

function buildLessSweetAdjustment(context: ChefAssistantContext): ChefAssistantResponse {
  const currentPod = context.currentRecipe?.metrics.podPct ?? 16;
  const targetPodPct = Math.max(currentPod - 2.5, 11.5);

  return {
    summary: "I can trim sweetness without letting the case turn to marble.",
    cards: [
      {
        id: "less-sweet",
        type: "diagnostic",
        title: "Lower POD, hold the PAC",
        subtitle: `Current POD is ${currentPod.toFixed(1)}. The copilot will bias toward Dextrose plus Polydextrose or Maltodextrin.`,
        bullets: [
          "Sucrose pressure comes down, body-support sugars come up.",
          "The target PAC stays in the same service window while perceived sweetness drops.",
          "If Polydextrose is not available, the solver will fall back to Maltodextrin support.",
        ],
        ctaLabel: "Apply Adjustment",
        action: {
          type: "reduce-sweetness",
          targetPodPct,
          note: "Sucrose will be softened and the blend will lean on Dextrose plus structure sugars.",
        },
      },
    ],
  };
}

function buildFallbackNote(context: ChefAssistantContext): ChefAssistantResponse {
  const profile = `${context.selectedEquipment.brand} ${context.selectedEquipment.model} on ${context.displayType}`;

  return {
    summary: "The Maestro is listening, but this request needs a sharper cue.",
    cards: [
      {
        id: "note-default",
        type: "note",
        title: "Try a kitchen-ready prompt",
        subtitle: profile,
        bullets: [
          "Ask for a flavor draft, like 'I want a rich hazelnut recipe.'",
          "Or ask for diagnostics, like 'My pistachio is too hard.'",
          `The assistant is currently grounded in your pantry, archetypes, and ${profile} setup.`,
        ],
      },
    ],
  };
}

export function buildChefAssistantResponse(
  message: string,
  context: ChefAssistantContext
): ChefAssistantResponse {
  void chefAssistantPrompt;

  const normalized = normalize(message);

  if (/too hard|hard scoop|hard in the case|too cold/.test(normalized)) {
    return buildHardnessDiagnostic(context) ?? buildFallbackNote(context);
  }

  if (/less sweet|less sugary|reduce sweetness|not so sweet|make this less sweet/.test(normalized)) {
    return buildLessSweetAdjustment(context);
  }

  return buildRecipeCard(message, context) ?? buildFallbackNote(context);
}
