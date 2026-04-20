export type NutritionProxyScan = {
  fat: number;
  carbohydrates: number;
  sugars: number;
  protein: number;
  totalSolids: number;
  rawText: string;
};

function parseMetric(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(
      `${label}\\s*(?:g|gr|grams?)?\\s*[:\\-]?\\s*([0-9]+(?:[.,][0-9]+)?)`,
      "i"
    );
    const match = text.match(pattern);

    if (match?.[1]) {
      const parsed = Number(match[1].replace(",", "."));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

export function parseNutritionLabelText(rawText: string): NutritionProxyScan {
  const normalized = rawText.replace(/\s+/g, " ").trim();
  const fat = parseMetric(normalized, ["FAT", "GRASSI"]);
  const carbohydrates = parseMetric(normalized, ["CARBOHYDRATES", "CARBOIDRATI"]);
  const sugars = parseMetric(normalized, ["SUGARS", "ZUCCHERI", "DI CUI ZUCCHERI"]);
  const protein = parseMetric(normalized, ["PROTEIN", "PROTEINE"]);
  const totalSolids = Math.round((fat + carbohydrates + protein) * 100) / 100;

  return {
    fat,
    carbohydrates,
    sugars: sugars || carbohydrates,
    protein,
    totalSolids,
    rawText: normalized,
  };
}
