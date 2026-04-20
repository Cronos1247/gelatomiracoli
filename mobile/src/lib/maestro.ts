import { getWebApiBaseUrl } from "./config";
import type { Archetype, ArchetypeKey, MaestroDraft, MobileIngredient } from "../types";

export const ARCHETYPES: Record<ArchetypeKey, Archetype> = {
  "milk-based-standard": {
    key: "milk-based-standard",
    label: "Milk-Based Standard",
    subtitle: "Classic crema and everyday gelato service",
    fat: 8.5,
    sugar: 18,
    solids: 38,
    pac: 245,
    pod: 17,
  },
  "high-fat": {
    key: "high-fat",
    label: "High-Fat Chocolate / Nut",
    subtitle: "Built for cocoa butter, pistachio, and hazelnut load",
    fat: 12,
    sugar: 17,
    solids: 40,
    pac: 235,
    pod: 16,
  },
  "fruit-sorbet": {
    key: "fruit-sorbet",
    label: "Fruit Sorbet",
    subtitle: "Bright fruit service with low fat and higher PAC",
    fat: 0.5,
    sugar: 29,
    solids: 31,
    pac: 290,
    pod: 28,
  },
  "low-sugar": {
    key: "low-sugar",
    label: "Low-Sugar Modern",
    subtitle: "Lower sweetness with structure support sugars",
    fat: 9,
    sugar: 12,
    solids: 36,
    pac: 240,
    pod: 13,
  },
  "clean-label": {
    key: "clean-label",
    label: "Clean Label",
    subtitle: "From-scratch artisan build with raw structure ingredients",
    fat: 8.5,
    sugar: 17,
    solids: 36,
    pac: 238,
    pod: 16,
  },
  vegan: {
    key: "vegan",
    label: "Vegan",
    subtitle: "Cocoa-water or nut-water structure without lactose",
    fat: 9,
    sugar: 17,
    solids: 38,
    pac: 240,
    pod: 15,
  },
  "sugar-free": {
    key: "sugar-free",
    label: "Sugar-Free",
    subtitle: "Polyol-led softness with restrained POD",
    fat: 9,
    sugar: 11,
    solids: 36,
    pac: 245,
    pod: 9,
  },
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function inferArchetype(keyword: string): Archetype {
  const value = normalize(keyword);

  if (/(sorbet|mango|strawberry|fruit|lemon|limone)/.test(value)) {
    return ARCHETYPES["fruit-sorbet"];
  }

  if (/(dark chocolate|chocolate|cocoa|hazelnut|pistachio|nut|nocciola|pistacchio)/.test(value)) {
    return ARCHETYPES["high-fat"];
  }

  if (/(light|modern|low sugar|less sweet)/.test(value)) {
    return ARCHETYPES["low-sugar"];
  }

  if (/(clean label|from scratch|scratch|artisan|custom scratch)/.test(value)) {
    return ARCHETYPES["clean-label"];
  }

  if (/(vegan|plant based|plant-based|dairy free|dairy-free)/.test(value)) {
    return ARCHETYPES.vegan;
  }

  if (/(sugar free|sugar-free|keto|zero sugar)/.test(value)) {
    return ARCHETYPES["sugar-free"];
  }

  return ARCHETYPES["milk-based-standard"];
}

function pickMatches(keyword: string, ingredients: MobileIngredient[]) {
  const value = normalize(keyword);

  return ingredients
    .filter((ingredient) => normalize(ingredient.name).includes(value))
    .sort((left, right) => {
      const masterScoreLeft = left.is_master ? 1 : 0;
      const masterScoreRight = right.is_master ? 1 : 0;
      return masterScoreRight - masterScoreLeft;
    })
    .slice(0, 3);
}

export function buildLocalMaestroDraft(keyword: string, ingredients: MobileIngredient[]): MaestroDraft {
  const archetype = inferArchetype(keyword);
  const matchedIngredients = pickMatches(keyword, ingredients);
  const fallbackMatches =
    matchedIngredients.length > 0
      ? matchedIngredients
      : ingredients.filter((ingredient) =>
          /cocoa powder|dark chocolate|hazelnut|pistachio|strawberry|mango|lemon/i.test(
            ingredient.name
          )
        );

  return {
    title: keyword.trim() ? `${keyword.trim()} draft` : "Maestro draft",
    archetype,
    matchedIngredients: fallbackMatches.slice(0, 3),
    notes: [
      `Target fat ${archetype.fat}% | sugar ${archetype.sugar}% | solids ${archetype.solids}%`,
      `Service window PAC ${archetype.pac} and POD ${archetype.pod}.`,
      fallbackMatches.length
        ? `Pantry lead: ${fallbackMatches.map((item) => item.name).join(", ")}.`
        : "No exact pantry hit yet, so the app is leaning on the archetype only.",
    ],
  };
}

export async function askWebMaestro(
  message: string,
  ingredients: MobileIngredient[]
): Promise<string | null> {
  const baseUrl = getWebApiBaseUrl();

  if (!baseUrl) {
    return null;
  }

  const response = await fetch(`${baseUrl}/api/chef-assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      context: {
        ingredients,
        selectedEquipment: {
          brand: "Bravo",
          model: "Trittico",
          heating_capability: true,
          default_overrun_pct: 30,
        },
        displayType: "Standard Case",
        availableSugars: ["Sucrose", "Dextrose", "Maltodextrin"],
        pantryStock: {},
        currentRecipe: null,
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { summary?: string };
  return payload.summary ?? null;
}
