"use client";

import { useMemo, useState } from "react";
import { useRecipeContext } from "@/src/miracoli/recipe/RecipeContext";
import type { ChefAssistantCard, ChefAssistantResponse } from "@/lib/chef-assistant/types";
import type { AppLanguage } from "@/lib/i18n";

type ChefIntent = "REDUCE_SWEETNESS" | "FIX_TEXTURE" | "SCALE_BATCH" | "SWITCH_LANGUAGE" | "UNKNOWN";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.% ]+/g, " ").trim();
}

function parseLanguageCommand(message: string): AppLanguage | null {
  const normalized = normalize(message);

  if (/italiano|italian/.test(normalized)) {
    return "it";
  }

  if (/spanish|espanol|español/.test(normalized)) {
    return "es";
  }

  if (/english|ingles|inglés/.test(normalized)) {
    return "en";
  }

  return null;
}

function parseScaleTarget(message: string) {
  const normalized = normalize(message);
  const litersMatch = normalized.match(/(\d+(?:\.\d+)?)\s*l(?:iters|itres|itri)?\b/);

  if (litersMatch) {
    return { targetLiters: Number(litersMatch[1]) };
  }

  const factorMatch = normalized.match(/(\d+(?:\.\d+)?)\s*x\b/);

  if (factorMatch) {
    return { factor: Number(factorMatch[1]) };
  }

  if (/double|twice/.test(normalized)) {
    return { factor: 2 };
  }

  return null;
}

function inferIntent(message: string): ChefIntent {
  const normalized = normalize(message);

  if (/less sweet|lower the sugar|reduce sweetness|not so sweet|menos dulce|meno dolce/.test(normalized)) {
    return "REDUCE_SWEETNESS";
  }

  if (/fix texture|too icy|too sandy|too thin|texture|body/.test(normalized)) {
    return "FIX_TEXTURE";
  }

  if (/make \d|scale|double|liters|litres|litri|\dx\b/.test(normalized)) {
    return "SCALE_BATCH";
  }

  if (parseLanguageCommand(normalized)) {
    return "SWITCH_LANGUAGE";
  }

  return "UNKNOWN";
}

function buildResponse(summary: string, cards: ChefAssistantCard[]): ChefAssistantResponse {
  return { summary, cards };
}

export function useChefAssistant() {
  const recipe = useRecipeContext();
  const [response, setResponse] = useState<ChefAssistantResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rotatingTips = useMemo(
    () => [
      "Ask me to balance this...",
      "Try: Make it more creamy",
      "Try: Lower the sugar",
      "Try: Make 5 liters",
      "Try: Switch to Italian",
    ],
    []
  );

  const submit = async (message: string) => {
    const normalized = normalize(message);

    if (!normalized) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const before = recipe.captureSnapshot();
      const intent = inferIntent(normalized);

      if (intent === "REDUCE_SWEETNESS") {
        const nextPod = Number((recipe.currentTargetPodPct * 0.85).toFixed(1));
        const mutation = recipe.updateTargetPhysics({
          targetPodPct: nextPod,
          sugarReduction: true,
        });

        if (!mutation.ok) {
          const warning = buildResponse("The Maestro sees a scoopability risk.", [
            {
              id: "warning-soft",
              type: "diagnostic",
              title: "Too soft to scoop",
              subtitle: mutation.warning ?? "This move would make the batch unstable in service.",
              bullets: ["Back the PAC down or keep the current profile."],
            },
          ]);
          setResponse(warning);
          return warning;
        }

        recipe.pushAssistantChange({
          message: "Maestro decreased sweetness and rebalanced the sugar system.",
          snapshot: before,
          pulseTarget: "pod",
        });

        const result = buildResponse("Sweetness trimmed. PAC is still protected.", [
          {
            id: "reduce-sweetness",
            type: "diagnostic",
            title: "POD reduced to 85%",
            subtitle: `Target POD moved to ${nextPod.toFixed(1)} and the sugar blend will lean on Dextrose plus body sugars.`,
            bullets: [
              "Sucrose pressure is reduced automatically.",
              "Maltodextrin and Polydextrose stay available to preserve body.",
            ],
          },
        ]);
        setResponse(result);
        return result;
      }

      if (intent === "FIX_TEXTURE") {
        if (recipe.currentTargetSolidsPct >= 36) {
          const result = buildResponse("The texture target is already in the safe solids window.", [
            {
              id: "texture-ok",
              type: "note",
              title: "Solids are already supported",
              subtitle: `Current target solids are ${recipe.currentTargetSolidsPct.toFixed(1)}%.`,
              bullets: ["I would inspect PAC, overrun, and serving temperature next."],
            },
          ]);
          setResponse(result);
          return result;
        }

        recipe.updateIngredientWeight("NFDM", 5);
        recipe.updateTargetPhysics({
          targetSolidsPct: Math.max(36, Number((recipe.currentTargetSolidsPct + 0.5).toFixed(1))),
        });
        recipe.pushAssistantChange({
          message: "Maestro increased NFDM support by 5g.",
          snapshot: before,
          pulseTarget: "solids",
        });

        const result = buildResponse("Texture support added.", [
          {
            id: "fix-texture",
            type: "diagnostic",
            title: "NFDM boosted in 5g steps",
            subtitle: "The body curve was running light.",
            bullets: [
              "Skim Milk Powder support was increased by 5g equivalent.",
              "Target solids were nudged back toward the 36% floor.",
            ],
          },
        ]);
        setResponse(result);
        return result;
      }

      if (intent === "SCALE_BATCH") {
        const scale = parseScaleTarget(normalized);

        if (!scale) {
          const result = buildResponse("I need a target size to scale the batch.", [
            {
              id: "scale-help",
              type: "note",
              title: "Give me a size",
              subtitle: "Example: Make 5 liters or scale 2x.",
              bullets: ["I can scale by liters or by a simple multiplication factor."],
            },
          ]);
          setResponse(result);
          return result;
        }

        recipe.scaleBatch(scale);
        recipe.pushAssistantChange({
          message:
            "targetLiters" in scale && scale.targetLiters
              ? `Maestro scaled the batch to ${scale.targetLiters} liters.`
              : `Maestro scaled the batch by ${scale.factor}x.`,
          snapshot: before,
          pulseTarget: "batch",
        });

        const result = buildResponse("Batch scaled.", [
          {
            id: "scale-batch",
            type: "diagnostic",
            title: "Batch size updated",
            subtitle:
              "targetLiters" in scale && scale.targetLiters
                ? `The production sheet is now aiming for ${scale.targetLiters} L.`
                : `The recipe was multiplied by ${scale.factor}x.`,
            bullets: ["All ingredient weights will reflow through the balancing engine."],
          },
        ]);
        setResponse(result);
        return result;
      }

      if (intent === "SWITCH_LANGUAGE") {
        const nextLanguage = parseLanguageCommand(normalized);

        if (nextLanguage) {
          await recipe.setLanguagePreference(nextLanguage);
          recipe.pushAssistantChange({
            message:
              nextLanguage === "it"
                ? "Maestro switched the studio to Italian."
                : nextLanguage === "es"
                  ? "Maestro switched the studio to Spanish."
                  : "Maestro switched the studio to English.",
            snapshot: before,
            pulseTarget: null,
          });

          const result = buildResponse("Language updated.", [
            {
              id: "language-switch",
              type: "note",
              title: "Studio language changed",
              subtitle:
                nextLanguage === "it"
                  ? "Ora parliamo in Italiano."
                  : nextLanguage === "es"
                    ? "Ahora hablamos en español."
                    : "We are back in English.",
              bullets: ["The pantry labels and PDF headers will follow the active language."],
            },
          ]);
          setResponse(result);
          return result;
        }
      }

      const fallback = buildResponse("The Maestro needs a sharper command.", [
        {
          id: "fallback",
          type: "note",
          title: "Try a direct production command",
          subtitle: "Examples: lower the sugar, make 5 liters, or switch to Italian.",
          bullets: ["I can adjust sweetness, support texture, scale batches, and switch language."],
        },
      ]);
      setResponse(fallback);
      return fallback;
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Assistant command failed.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    response,
    submit,
    rotatingTips,
  };
}
