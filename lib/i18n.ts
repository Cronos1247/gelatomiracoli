import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/lib/translations/en.json";
import es from "@/lib/translations/es.json";
import it from "@/lib/translations/it.json";

export const SUPPORTED_LANGUAGES = ["en", "es", "it"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = "gelato-miracoli-language";

export const translationResources = {
  en: { translation: en },
  es: { translation: es },
  it: { translation: it },
} as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: translationResources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });
}

export function getDateLocale(language: AppLanguage) {
  if (language === "it") {
    return "it-IT";
  }

  if (language === "es") {
    return "es-ES";
  }

  return "en-US";
}

const ingredientNameDictionary: Record<string, Partial<Record<AppLanguage, string>>> = {
  "Whole Milk": { it: "Latte Intero", es: "Leche Entera", en: "Whole Milk" },
  "Heavy Cream": { it: "Panna Fresca", es: "Crema de Leche", en: "Heavy Cream" },
  "Heavy Cream (36%)": {
    it: "Panna Fresca (36%)",
    es: "Crema de Leche (36%)",
    en: "Heavy Cream (36%)",
  },
  Dextrose: { it: "Destrosio", es: "Dextrosa", en: "Dextrose" },
  Sucrose: { it: "Saccarosio", es: "Sacarosa", en: "Sucrose" },
  "Invert Sugar": { it: "Zucchero Invertito", es: "Azucar Invertido", en: "Invert Sugar" },
  Polydextrose: { it: "Polidestrosio", es: "Polidextrosa", en: "Polydextrose" },
  "Maltodextrin (DE19)": {
    it: "Maltodestrina (DE19)",
    es: "Maltodextrina (DE19)",
    en: "Maltodextrin (DE19)",
  },
  NFDM: { it: "Latte Magro in Polvere", es: "Leche Desnatada en Polvo", en: "NFDM" },
  "Skim Milk Powder (NFDM)": {
    it: "Latte Magro in Polvere (NFDM)",
    es: "Leche en Polvo Desnatada (NFDM)",
    en: "Skim Milk Powder (NFDM)",
  },
  "Dark Chocolate (70%)": {
    it: "Cioccolato Fondente (70%)",
    es: "Chocolate Negro (70%)",
    en: "Dark Chocolate (70%)",
  },
  "Milk Chocolate (Standard)": {
    it: "Cioccolato al Latte (Standard)",
    es: "Chocolate con Leche (Estandar)",
    en: "Milk Chocolate (Standard)",
  },
  "Cocoa Powder (22/24)": {
    it: "Cacao in Polvere (22/24)",
    es: "Cacao en Polvo (22/24)",
    en: "Cocoa Powder (22/24)",
  },
  "Pistachio Paste (Pure)": {
    it: "Pasta di Pistacchio (Pura)",
    es: "Pasta de Pistacho (Pura)",
    en: "Pistachio Paste (Pure)",
  },
  "Hazelnut Paste (Pure)": {
    it: "Pasta di Nocciola (Pura)",
    es: "Pasta de Avellana (Pura)",
    en: "Hazelnut Paste (Pure)",
  },
  "Strawberry (Fresh/Puree)": {
    it: "Fragola (Fresca/Purea)",
    es: "Fresa (Fresca/Pure)",
    en: "Strawberry (Fresh/Puree)",
  },
  "Mango (Alphonso Puree)": {
    it: "Mango (Purea Alphonso)",
    es: "Mango (Pure Alphonso)",
    en: "Mango (Alphonso Puree)",
  },
  "Lemon Juice": { it: "Succo di Limone", es: "Jugo de Limon", en: "Lemon Juice" },
};

export function translateIngredientName(
  ingredient: {
    name: string;
    name_en?: string | null;
    name_es?: string | null;
    name_it?: string | null;
  },
  language: AppLanguage
) {
  if (language === "en") {
    return ingredient.name_en ?? ingredient.name;
  }

  if (language === "es") {
    return ingredient.name_es ?? ingredientNameDictionary[ingredient.name]?.es ?? ingredient.name;
  }

  return ingredient.name_it ?? ingredientNameDictionary[ingredient.name]?.it ?? ingredient.name;
}

export function translateIngredientLabel(name: string, language: AppLanguage) {
  return (
    ingredientNameDictionary[name]?.[language] ??
    (language === "en" ? ingredientNameDictionary[name]?.en : undefined) ??
    name
  );
}

export default i18n;
