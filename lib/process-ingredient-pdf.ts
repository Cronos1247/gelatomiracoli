import type { Ingredient } from "@/lib/default-data";

export type ParsedIngredientPdf = {
  rawText: string;
  confidenceScore: number;
  needsManualReview: boolean;
  warningFlags: string[];
  debug: {
    balancingSection: string | null;
    nutritionSection: string | null;
    balancingValues: Record<string, number | null>;
    nutritionValues: Record<string, number | null>;
  };
  extracted: {
    name: string;
    brand_name: string;
    product_code: string;
    upc: string;
    revision_date: string | null;
    category: Ingredient["category"];
    is_dairy?: boolean;
    fat_pct: number;
    sugar_pct: number;
    total_solids_pct: number;
    msnf_pct: number;
    protein_g: number;
    kcal_per_100g: number;
    dosage_guideline: number | null;
    cost_per_kg: number;
    average_market_cost: number;
    cost_per_container?: number;
    container_size_g?: number;
    pac_value: number;
    pod_value: number;
    extraction_source: "Balancing Parameters" | "Nutritional Fallback";
    is_cold_process: boolean;
  };
};

export function derivePacPod({
  sugarPct,
  proteinG,
}: {
  sugarPct: number;
  proteinG: number;
}) {
  const pac = sugarPct * 1 + proteinG * 1;
  const pod = sugarPct * 1 + proteinG * 0.16;

  return {
    pac_value: Math.round(pac * 100) / 100,
    pod_value: Math.round(pod * 100) / 100,
  };
}

function parseNumber(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizePercentValue(value: number | null) {
  if (value === null) {
    return null;
  }

  if (value < 0 || value > 100) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

function mapToRecord(map: Map<string, number | null>) {
  return Object.fromEntries(map.entries()) as Record<string, number | null>;
}

function escapePattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractNumberByLabel(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(
      `${escapePattern(label)}\\s*[:\\-]?\\s*([0-9]+(?:[.,][0-9]+)?)`,
      "i"
    );
    const match = text.match(pattern);

    if (match) {
      return parseNumber(match[1]);
    }
  }

  return null;
}

function normalizeTableLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function isHeadingLine(line: string) {
  return /^[A-Z][A-Z /&()%-]{5,}$/.test(line);
}

function parseNumericCell(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized === "-" || normalized === "–") {
    return 0;
  }

  const match = normalized.match(/([0-9]+(?:[.,][0-9]+)?)/);
  return parseNumber(match?.[1] ?? null);
}

function extractOrderedTableValues(section: string | null, labels: string[]) {
  if (!section) {
    return new Map<string, number | null>();
  }

  const lines = section
    .split(/\n+/)
    .map(normalizeTableLine)
    .filter(Boolean);

  const normalizedLabels = labels.map((label) => label.toUpperCase());
  const labelPositions = normalizedLabels.map((label) =>
    lines.findIndex((line) => line.toUpperCase() === label)
  );

  if (labelPositions.some((index) => index < 0)) {
    return new Map<string, number | null>();
  }

  const lastLabelIndex = Math.max(...labelPositions);
  const valueLines = lines
    .slice(lastLabelIndex + 1)
    .filter((line) => !isHeadingLine(line))
    .slice(0, normalizedLabels.length);

  if (valueLines.length < normalizedLabels.length) {
    return new Map<string, number | null>();
  }

  return new Map(
    normalizedLabels.map((label, index) => [label, parseNumericCell(valueLines[index])])
  );
}

function extractCompactTableValues(section: string | null, labels: string[]) {
  if (!section) {
    return new Map<string, number | null>();
  }

  const normalizedSection = section.replace(/\s+/g, " ").trim();
  const labelBlock = labels.map((label) => escapePattern(label)).join("\\s+");
  const valueBlock = labels
    .map(() => "([0-9]+(?:[.,][0-9]+)?|-)(?:\\s*g|\\s*kcal\\s*/100g)?")
    .join("\\s+");
  const pattern = new RegExp(`${labelBlock}\\s+${valueBlock}`, "i");
  const match = normalizedSection.match(pattern);

  if (!match) {
    return new Map<string, number | null>();
  }

  return new Map(
    labels.map((label, index) => [label.toUpperCase(), parseNumericCell(match[index + 1])])
  );
}

function extractSequentialTableValues(section: string | null, labels: string[]) {
  if (!section) {
    return new Map<string, number | null>();
  }

  let normalizedSection = section.replace(/\s+/g, " ").trim();
  normalizedSection = normalizedSection.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

  const labelPattern = labels.map((label) => escapePattern(label)).join("\\s+");
  const labelSequence = new RegExp(labelPattern, "i");
  const labelMatch = normalizedSection.match(labelSequence);

  if (!labelMatch?.index && labelMatch?.index !== 0) {
    return new Map<string, number | null>();
  }

  const tail = normalizedSection.slice(labelMatch.index + labelMatch[0].length).trim();
  const tokenMatches = Array.from(
    tail.matchAll(/(?:^|\s)(-|[0-9]+(?:[.,][0-9]+)?)(?=\s*(?:g|kcal|$))/gi)
  )
    .map((match) => match[1])
    .slice(0, labels.length);

  if (tokenMatches.length < labels.length) {
    return new Map<string, number | null>();
  }

  return new Map(
    labels.map((label, index) => [label.toUpperCase(), parseNumericCell(tokenMatches[index])])
  );
}

function extractInlineLabeledValues(section: string | null, labels: string[]) {
  if (!section) {
    return new Map<string, number | null>();
  }

  const normalizedSection = section.replace(/\s+/g, " ").trim();

  return new Map(
    labels.map((label) => {
      const pattern = new RegExp(
        `${escapePattern(label)}\\s*[:\\-]?\\s*(-|[0-9]+(?:[.,][0-9]+)?)(?=\\s*(?:g|kcal|kj|%|[A-Z][a-z]|[A-Z]{2,}|$))`,
        "i"
      );
      const match = normalizedSection.match(pattern);

      return [label.toUpperCase(), parseNumericCell(match?.[1])];
    })
  );
}

function extractAnchoredPregelTableValues(
  rawText: string,
  heading: string,
  labels: string[],
  windowLength = 280
) {
  const normalized = rawText
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const labelPattern = labels.map((label) => escapePattern(label)).join("\\s+");
  const pattern = new RegExp(
    `${escapePattern(heading)}.{0,160}?${labelPattern}\\s+([\\s\\S]{0,${windowLength}})`,
    "i"
  );
  const match = normalized.match(pattern);

  if (!match?.[1]) {
    return new Map<string, number | null>();
  }

  const tokens = Array.from(
    match[1].matchAll(/(?:^|\s)(-|[0-9]+(?:[.,][0-9]+)?)(?=\s*(?:g|kcal|kj|%|$))/gi)
  )
    .map((tokenMatch) => tokenMatch[1])
    .slice(0, labels.length);

  if (tokens.length < labels.length) {
    return new Map<string, number | null>();
  }

  return new Map(
    labels.map((label, index) => [label.toUpperCase(), parseNumericCell(tokens[index])])
  );
}

function extractTextByLabel(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(
      `${escapePattern(label)}\\s*[:\\-]?\\s*([A-Za-z0-9./&()\\- ]{3,})`,
      "i"
    );
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractMetricValue(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(
      `${escapePattern(label)}\\s*[:\\-]?\\s*([0-9]+(?:[.,][0-9]+)?)`,
      "i"
    );
    const match = text.match(pattern);

    if (match?.[1]) {
      return parseNumber(match[1]);
    }
  }

  return null;
}

function extractPattern(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractDosage(text: string) {
  const match = text.match(
    /([0-9]+(?:[.,][0-9]+)?)\s*g\s*(?:per|\/)\s*1\s*kg|1\s*kg\s*(?:mix)?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*g/i
  );

  if (!match) {
    return null;
  }

  return parseNumber(match[1] ?? match[2]);
}

function extractDosageForGelato(text: string) {
  const focusedSection =
    text.match(/DOSAGE FOR GELATO[\s\S]{0,260}/i)?.[0] ??
    text.match(/DOSAGGIO PER L['’]IMPIEGO[\s\S]{0,260}/i)?.[0] ??
    text;
  const gramMatches = Array.from(
    focusedSection.matchAll(/([0-9]+(?:[.,][0-9]+)?)\s*g\b/gi)
  )
    .map((match) => parseNumber(match[1]))
    .filter((value): value is number => value !== null);

  const preferredDose = gramMatches.find((value) => value > 0 && value <= 250);

  if (preferredDose !== undefined) {
    return preferredDose;
  }

  return extractDosage(text);
}

function isPreGelTechnicalSheet(text: string) {
  return /pregel|nutrient\s+per\s*\(100g\)/i.test(text);
}

function normalizeWhitespace(text: string) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function collapseSpacedWord(match: string) {
  return match.replace(/\s+/g, "");
}

function normalizeLeadingOcrText(rawText: string) {
  const lead = rawText.slice(0, 200).replace(/\b(?:[A-Za-z]\s){2,}[A-Za-z]\b/g, collapseSpacedWord);
  return `${lead}${rawText.slice(200)}`;
}

function hasWeakPdfTextLayer(rawText: string) {
  const normalized = rawText.toUpperCase();
  const hasAnchors =
    normalized.includes("BALANCING PARAMETERS") ||
    normalized.includes("NUTRITION LABELLING") ||
    normalized.includes("NUTRITION LABELING") ||
    normalized.includes("CARBOHYDRATES") ||
    normalized.includes("TOTAL SOLIDS");
  const hasFragmentedWords = /\b(?:[A-Za-z]\s){3,}[A-Za-z]\b/.test(rawText.slice(0, 500));

  return rawText.length < 180 || (!hasAnchors && hasFragmentedWords);
}

function extractSection(text: string, heading: string, fallbackLength = 1400) {
  const index = text.toUpperCase().indexOf(heading.toUpperCase());

  if (index < 0) {
    return null;
  }

  const sliced = text.slice(index);
  const nextHeadingMatch = sliced
    .slice(heading.length)
    .match(/\n[A-Z][A-Z /&()-]{5,}(?=\n|$)/);

  if (!nextHeadingMatch?.index) {
    return sliced.slice(0, fallbackLength);
  }

  return sliced.slice(0, nextHeadingMatch.index + heading.length);
}

function extractSectionBetween(
  text: string,
  heading: string,
  stopHeadings: string[],
  fallbackLength = 1400
) {
  const upperText = text.toUpperCase();
  const startIndex = upperText.indexOf(heading.toUpperCase());

  if (startIndex < 0) {
    return null;
  }

  const searchStart = startIndex + heading.length;
  let endIndex = text.length;

  for (const stopHeading of stopHeadings) {
    const stopIndex = upperText.indexOf(stopHeading.toUpperCase(), searchStart);

    if (stopIndex >= 0 && stopIndex < endIndex) {
      endIndex = stopIndex;
    }
  }

  if (endIndex === text.length) {
    endIndex = Math.min(text.length, startIndex + fallbackLength);
  }

  return text.slice(startIndex, endIndex).trim();
}

function deriveNameFromFileName(fileName?: string) {
  if (!fileName) {
    return null;
  }

  const stem = fileName.replace(/\.[^.]+$/, "");
  const cleaned = stem
    .replace(/^\d{4,6}[_\-\s]*/, "")
    .replace(/\s*-\s*\d+\s*$/, "")
    .replace(/\bv\d{5,8}\b/gi, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function extractInstructionsSection(rawText: string) {
  return (
    extractSectionBetween(rawText, "DOSAGGIO PER L'IMPIEGO", [
      "CONDIZIONI DI UTILIZZO",
      "PH",
      "ENERGIA",
      "VALORI NUTRIZIONALI",
      "CARATTERISTICHE MICROBIOLOGICHE",
    ]) ??
    extractSectionBetween(rawText, "INSTRUCTIONS FOR USE", [
      "BALANCING PARAMETERS",
      "STORAGE",
      "PACKAGING",
      "NOTES",
    ]) ??
    extractSectionBetween(rawText, "DIRECTIONS FOR USE", [
      "BALANCING PARAMETERS",
      "STORAGE",
      "PACKAGING",
      "NOTES",
    ]) ??
    extractSection(rawText, "DOSAGE")
  );
}

function extractPregelGridValue(rawText: string, label: string) {
  const normalized = rawText.replace(/\s+/g, " ").trim();
  const pattern = new RegExp(
    `${escapePattern(label)}\\s*(?:[:\\-]|per\\s*100g)?\\s*([0-9]+(?:[.,][0-9]+)?)`,
    "i"
  );

  return parseNumber(normalized.match(pattern)?.[1] ?? null);
}

function extractPregelHeaderMetadata(rawText: string, fileName?: string) {
  const headerWindow = rawText
    .split(/\n+/)
    .slice(0, 14)
    .join("\n");
  const compactHeader = headerWindow.replace(/\s+/g, " ").trim();
  const explicitNameCode = compactHeader.match(
    /\b([A-Z][A-Z0-9 &'()\/+-]{3,}?)\s+(\d{5})\b/
  );

  if (explicitNameCode?.[1] && explicitNameCode?.[2]) {
    const candidateName = explicitNameCode[1].trim();

    if (!/\b(?:PRODUCT|ITEM|CODE|CODICE|DATE|NUTRIENT|PREGEL)\b/i.test(candidateName)) {
      return {
        name: candidateName,
        productCode: explicitNameCode[2].trim(),
      };
    }
  }

  const explicitLabeledHeader = compactHeader.match(
    /\b(?:PRODUCT NAME|NAME|NOME)\b\s*[:\-]?\s*([A-Z0-9 &'()\/+-]{3,}?)\s+(?:CODE|CODICE)?\s*[:\-]?\s*(\d{5})\b/i
  );

  if (explicitLabeledHeader?.[1] && explicitLabeledHeader?.[2]) {
    return {
      name: explicitLabeledHeader[1].trim(),
      productCode: explicitLabeledHeader[2].trim(),
    };
  }

  const code = extractProductCode(rawText, fileName);
  const fileDerivedName = deriveNameFromFileName(fileName);

  if (fileDerivedName) {
    return {
      name: code && fileDerivedName.toUpperCase().endsWith(code)
        ? fileDerivedName.slice(0, -code.length).trim()
        : fileDerivedName,
      productCode: code,
    };
  }

  return {
    name: extractName(rawText, fileName),
    productCode: code,
  };
}

function extractPregelKosherDairyFlag(rawText: string) {
  return /Kosher\s+Status\s*[:\-]?\s*Certified\s+Dairy/i.test(rawText);
}

export function extractBalancingParametersTable(rawText: string) {
  const boundedSection = extractSectionBetween(rawText, "BALANCING PARAMETERS", [
    "STORAGE",
    "PACKAGING",
    "NOTES",
    "MICROBIOLOGICAL PARAMETERS",
  ]);

  if (boundedSection) {
    return boundedSection;
  }

  const regexMatch = rawText.match(
    /BALANCING PARAMETERS([\s\S]{0,1800}?)(?:\n[A-Z][A-Z /&()-]{5,}(?=\n|$)|$)/i
  );

  if (regexMatch?.[0]) {
    return regexMatch[0].trim();
  }

  return extractSection(rawText, "BALANCING PARAMETERS");
}

function inferCategory(name: string): Ingredient["category"] {
  const normalized = name.toLowerCase();

  if (
    normalized.includes("neutro") ||
    normalized.includes("stabilizer") ||
    normalized.includes("stabiliser") ||
    /\bbase\b/.test(normalized)
  ) {
    return "Base/Stabilizer";
  }

  if (
    normalized.includes("milk") ||
    normalized.includes("cream") ||
    normalized.includes("dairy")
  ) {
    return "Dairy";
  }

  if (
    normalized.includes("sugar") ||
    normalized.includes("dextrose") ||
    normalized.includes("sucrose")
  ) {
    return "Sugar";
  }

  if (
    normalized.includes("pistach") ||
    normalized.includes("pistac") ||
    normalized.includes("hazelnut") ||
    normalized.includes("nocciola") ||
    normalized.includes("mandorla") ||
    normalized.includes("pasta") ||
    normalized.includes("nut") ||
    normalized.includes("paste")
  ) {
    return "Flavor Paste";
  }

  if (
    normalized.includes("chocolate") ||
    normalized.includes("fondente") ||
    normalized.includes("cocoa") ||
    normalized.includes("cacao")
  ) {
    return "Flavor Paste";
  }

  return "Other";
}

function extractName(rawText: string, fileName?: string) {
  const labeledName = rawText.match(
    /\b(?:PRODUCT NAME|NAME|NOME)\b\s*[:\-]?\s*([A-Za-z0-9 ,.'&()/-]{3,})/i
  );

  if (labeledName?.[1]) {
    return labeledName[1].trim();
  }

  const multilineLabeledName = rawText.match(
    /\b(?:PRODUCT NAME|NAME|NOME)\b\s*[:\-]?\s*\n+\s*([^\n\r]{3,80})/i
  );

  if (multilineLabeledName?.[1]) {
    return multilineLabeledName[1].trim();
  }

  const fileNameName = deriveNameFromFileName(fileName);

  if (fileNameName) {
    return fileNameName;
  }

  const balancingLead = rawText.match(
    /([A-Za-z][A-Za-z0-9 ,.'&()/-]{4,}?)\s+BALANCING PARAMETERS/i
  );

  if (balancingLead?.[1]) {
    return balancingLead[1].trim();
  }

  const beforeBalancing = rawText.split(/BALANCING PARAMETERS/i)[0] ?? rawText;
  const candidates = beforeBalancing
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 4 &&
        !/pregel|nutrition|technical|sheet|rev\.|page|ingredients|allergen/i.test(line)
    );

  return candidates.at(-1) ?? "Scanned Ingredient";
}

function extractBrand(rawText: string) {
  const explicitBrand = extractTextByLabel(rawText, [
    "PRODUCT BRAND",
    "BRAND",
    "MANUFACTURER",
    "MARCA",
  ]);

  if (explicitBrand) {
    return explicitBrand;
  }

  const knownBrands = ["PreGel", "Mec3", "Comprital", "Martini", "Fabbri", "Babbi"];

  return knownBrands.find((brand) => new RegExp(escapePattern(brand), "i").test(rawText)) ?? "";
}

function extractProductCode(rawText: string, fileName?: string) {
  const leadText = rawText.slice(0, 100);
  const firstLeadNumber = extractPattern(leadText, [/\b(\d{4,6})\b/]);
  const fileLeadNumber = fileName ? extractPattern(fileName, [/^(\d{4,6})/]) : null;
  const stCode = extractPattern(rawText, [/\bST-\s*(\d{5})\b/i]);

  return (
    fileLeadNumber ??
    stCode ??
    firstLeadNumber ??
    extractPattern(rawText, [
      /(?:PRODUCT CODE|ITEM CODE|SKU|CODE|CODICE|ART\.)\s*[:\-]?\s*([A-Z0-9-]{4,})/i,
    ]) ??
    ""
  );
}

function extractUpc(rawText: string) {
  const match = rawText.match(
    /(?:UPC|EAN|GTIN|BARCODE)\s*[:\-]?\s*([0-9][0-9 \-]{7,17}[0-9])/i
  );

  return match?.[1]?.replace(/\s+/g, "") ?? "";
}

function inferProcessMode(rawText: string) {
  if (/cold process|cold soluble|ready for cold/i.test(rawText)) {
    return true;
  }

  if (/hot process|pasteuriz|cook(?:ing)? phase|warm process/i.test(rawText)) {
    return false;
  }

  return true;
}

function toIsoDate(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\./g, "/").replace(/-/g, "/");
  const directDate = new Date(normalized);

  if (!Number.isNaN(directDate.getTime())) {
    return directDate.toISOString().slice(0, 10);
  }

  const dayFirstMatch = normalized.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);

  if (!dayFirstMatch) {
    return null;
  }

  const month = Number(dayFirstMatch[1]);
  const day = Number(dayFirstMatch[2]);
  const year = Number(dayFirstMatch[3].length === 2 ? `20${dayFirstMatch[3]}` : dayFirstMatch[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function extractRevisionDate(rawText: string) {
  const explicit = extractPattern(rawText, [
    /(?:REVISION DATE|DATE OF REVISION|ISSUE DATE|REV\.?\s*DATE)\s*[:\-]?\s*([0-9./-]{6,10})/i,
    /(?:REV(?:ISION)?\s*[0-9]*\s*[:\-]?\s*)([0-9./-]{6,10})/i,
  ]);

  return toIsoDate(explicit);
}

function calculateConfidenceScore(values: {
  productCode: string;
  fatPct: number;
  sugarPct: number;
  totalSolidsPct: number;
  revisionDate: string | null;
  extractionSource: "Balancing Parameters" | "Nutritional Fallback";
}) {
  let score = 28;

  if (values.productCode) {
    score += 18;
  }

  if (values.fatPct > 0) {
    score += 18;
  }

  if (values.sugarPct >= 0) {
    score += 12;
  }

  if (values.totalSolidsPct > 0) {
    score += 18;
  }

  if (values.revisionDate) {
    score += 10;
  }

  if (values.extractionSource === "Balancing Parameters") {
    score += 14;
  } else {
    score -= 8;
  }

  return Math.max(0, Math.min(100, score));
}

function createFallbackParsedResult(
  rawText: string,
  warningFlags: string[],
  fileName?: string
): ParsedIngredientPdf {
  const normalizedText = normalizeLeadingOcrText(rawText);
  const pregelHeader = isPreGelTechnicalSheet(normalizedText)
    ? extractPregelHeaderMetadata(normalizedText, fileName)
    : null;
  const name = pregelHeader?.name || extractName(normalizedText, fileName);
  const category =
    pregelHeader?.name && /\bbase\b/i.test(pregelHeader.name) ? "Base" : inferCategory(name);

  return {
    rawText,
    confidenceScore: 25,
    needsManualReview: true,
    warningFlags,
    debug: {
      balancingSection: null,
      nutritionSection: null,
      balancingValues: {},
      nutritionValues: {},
    },
    extracted: {
      name,
      brand_name: extractBrand(normalizedText),
      product_code: pregelHeader?.productCode || extractProductCode(normalizedText, fileName),
      upc: extractUpc(normalizedText),
      revision_date: extractRevisionDate(normalizedText),
      category,
      is_dairy: extractPregelKosherDairyFlag(normalizedText),
      fat_pct: 0,
      sugar_pct: 0,
      total_solids_pct: 0,
      msnf_pct: 0,
      protein_g: 0,
      kcal_per_100g: 0,
      dosage_guideline: extractDosageForGelato(
        extractInstructionsSection(normalizedText) ?? normalizedText
      ),
      cost_per_kg: 0,
      average_market_cost: 0,
      cost_per_container: 0,
      container_size_g: 1000,
      pac_value: 0,
      pod_value: 0,
      extraction_source: "Nutritional Fallback",
      is_cold_process: inferProcessMode(normalizedText),
    },
  };
}

export function parsePreGelTechnicalSheet(rawText: string, fileName?: string): ParsedIngredientPdf {
  try {
  const normalizedText = normalizeLeadingOcrText(rawText);
  const isPreGelSheet = isPreGelTechnicalSheet(normalizedText);
  const pregelHeader = isPreGelSheet
    ? extractPregelHeaderMetadata(normalizedText, fileName)
    : null;
  const name = pregelHeader?.name || extractName(normalizedText, fileName);
  const category =
    isPreGelSheet && /\bbase\b/i.test(name) ? "Base" : inferCategory(name);
  const brandName = extractBrand(normalizedText);
  const productCode = pregelHeader?.productCode || extractProductCode(normalizedText, fileName);
  const upc = extractUpc(normalizedText);
  const revisionDate = extractRevisionDate(normalizedText);
  const instructionsSection = extractInstructionsSection(normalizedText);
  const isDairy = extractPregelKosherDairyFlag(normalizedText);
  const warningFlags: string[] = [];
  const nutritionSection =
    extractSectionBetween(normalizedText, "NUTRITION LABELLING", [
      "INSTRUCTIONS FOR USE",
      "DOSAGE FOR GELATO",
      "BALANCING PARAMETERS",
      "STORAGE",
    ]) ??
    extractSectionBetween(normalizedText, "NUTRITIONAL INFORMATION", [
      "PRODUCT IMAGERY",
      "GINGER MCKINNEY",
      "DATE:",
      "NOTE:",
      "PACKAGING",
      "STORAGE",
    ]) ??
    extractSectionBetween(normalizedText, "NUTRITION LABELING", [
      "INSTRUCTIONS FOR USE",
      "DOSAGE FOR GELATO",
      "BALANCING PARAMETERS",
      "STORAGE",
    ]) ??
    extractSectionBetween(normalizedText, "NUTRITION FACTS", [
      "INSTRUCTIONS FOR USE",
      "DOSAGE FOR GELATO",
      "BALANCING PARAMETERS",
      "STORAGE",
    ]) ??
    extractSectionBetween(normalizedText, "VALORI NUTRIZIONALI", [
      "CARATTERISTICHE MICROBIOLOGICHE",
      "INGREDIENTI",
      "SCHEDA TECNICA PRODOTTO",
      "CODICE:",
      "TIPO PRODOTTO",
    ]);
  const balancingSection = extractBalancingParametersTable(normalizedText);
  const balancingTableValues = extractOrderedTableValues(balancingSection, [
    "SUGARS",
    "FAT",
    "SKIM MILK SOLIDS",
    "TOTAL SOLIDS",
  ]);
  const compactBalancingTableValues = extractCompactTableValues(balancingSection, [
    "SUGARS",
    "FAT",
    "SKIM MILK SOLIDS",
    "TOTAL SOLIDS",
  ]);
  const sequentialBalancingTableValues = extractSequentialTableValues(balancingSection, [
    "SUGARS",
    "FAT",
    "SKIM MILK SOLIDS",
    "TOTAL SOLIDS",
  ]);
  const inlineBalancingValues = extractInlineLabeledValues(balancingSection, [
    "SUGARS",
    "FAT",
    "SKIM MILK SOLIDS",
    "TOTAL SOLIDS",
  ]);
  const anchoredBalancingTableValues = extractAnchoredPregelTableValues(
    normalizedText,
    "BALANCING PARAMETERS",
    ["SUGARS", "FAT", "SKIM MILK SOLIDS", "TOTAL SOLIDS"]
  );
  const nutritionTableValues = extractOrderedTableValues(nutritionSection, [
    "ENERGY VALUE",
    "CARBOHYDRATES",
    "PROTEIN",
    "FAT",
  ]);
  const nutritionalInformationValues = extractInlineLabeledValues(nutritionSection, [
    "CALORIES (KCAL)",
    "PROTEIN (G)",
    "FAT (G)",
    "CARBOHYDRATES (G)",
    "ASH (G)",
    "MOISTURE (%)",
  ]);
  const italianNutritionValues = extractInlineLabeledValues(normalizedText, [
    "ENERGIA KCAL",
    "GRASSI G",
    "CARBOIDRATI G",
    "DI CUI ZUCCHERI G",
    "PROTEINE G",
    "SALE G",
  ]);
  const compactNutritionTableValues = extractCompactTableValues(nutritionSection, [
    "ENERGY VALUE",
    "CARBOHYDRATES",
    "PROTEIN",
    "FAT",
  ]);
  const sequentialNutritionTableValues = extractSequentialTableValues(nutritionSection, [
    "ENERGY VALUE",
    "CARBOHYDRATES",
    "PROTEIN",
    "FAT",
  ]);
  const inlineNutritionValues = extractInlineLabeledValues(nutritionSection, [
    "ENERGY VALUE",
    "CARBOHYDRATES",
    "PROTEIN",
    "FAT",
  ]);
  const anchoredNutritionTableValues = extractAnchoredPregelTableValues(
    normalizedText,
    "NUTRITION LABELLING",
    ["ENERGY VALUE", "CARBOHYDRATES", "PROTEIN", "FAT"]
  );
  const anchoredNutritionalInformationValues = extractAnchoredPregelTableValues(
    normalizedText,
    "NUTRITIONAL INFORMATION",
    ["CALORIES (KCAL)", "PROTEIN (G)", "FAT (G)", "CARBOHYDRATES (G)"],
    420
  );
  const pregelFat = isPreGelSheet ? sanitizePercentValue(extractPregelGridValue(normalizedText, "Fat (g)")) : null;
  const pregelSugar = isPreGelSheet
    ? sanitizePercentValue(extractPregelGridValue(normalizedText, "Sugars (g)"))
    : null;
  const pregelMoisture = isPreGelSheet
    ? sanitizePercentValue(extractPregelGridValue(normalizedText, "Moisture (%)"))
    : null;
  const balancingFat = sanitizePercentValue(
    balancingSection
      ? (balancingTableValues.get("FAT") ??
        compactBalancingTableValues.get("FAT") ??
        sequentialBalancingTableValues.get("FAT") ??
        inlineBalancingValues.get("FAT") ??
        anchoredBalancingTableValues.get("FAT") ??
        extractNumberByLabel(balancingSection, ["FAT", "FATS"]))
      : anchoredBalancingTableValues.get("FAT") ?? null
  );
  const balancingSugar = sanitizePercentValue(
    balancingSection
      ? (balancingTableValues.get("SUGARS") ??
        compactBalancingTableValues.get("SUGARS") ??
        sequentialBalancingTableValues.get("SUGARS") ??
        inlineBalancingValues.get("SUGARS") ??
        anchoredBalancingTableValues.get("SUGARS") ??
        extractNumberByLabel(balancingSection, ["SUGARS", "SUGAR"]))
      : anchoredBalancingTableValues.get("SUGARS") ?? null
  );
  const balancingSolids = sanitizePercentValue(
    balancingSection
      ? (balancingTableValues.get("TOTAL SOLIDS") ??
        compactBalancingTableValues.get("TOTAL SOLIDS") ??
        sequentialBalancingTableValues.get("TOTAL SOLIDS") ??
        inlineBalancingValues.get("TOTAL SOLIDS") ??
        anchoredBalancingTableValues.get("TOTAL SOLIDS") ??
        extractNumberByLabel(balancingSection, ["TOTAL SOLIDS", "TOTAL SOLID"]))
      : anchoredBalancingTableValues.get("TOTAL SOLIDS") ?? null
  );
  const hasBalancingValues = [balancingFat, balancingSugar, balancingSolids].some(
    (value) => value !== null
  );
  const hasNutritionValues = Boolean(nutritionSection);
  const nutritionCarbohydrates = sanitizePercentValue(
    nutritionSection
      ? (nutritionTableValues.get("CARBOHYDRATES") ??
        nutritionalInformationValues.get("CARBOHYDRATES (G)") ??
        italianNutritionValues.get("CARBOIDRATI G") ??
        compactNutritionTableValues.get("CARBOHYDRATES") ??
        sequentialNutritionTableValues.get("CARBOHYDRATES") ??
        inlineNutritionValues.get("CARBOHYDRATES") ??
        anchoredNutritionTableValues.get("CARBOHYDRATES") ??
        anchoredNutritionalInformationValues.get("CARBOHYDRATES (G)") ??
        extractMetricValue(nutritionSection, ["CARBOIDRATI G", "CARBOHYDRATES (G)", "CARBOHYDRATES"]))
      : anchoredNutritionTableValues.get("CARBOHYDRATES") ??
          anchoredNutritionalInformationValues.get("CARBOHYDRATES (G)") ??
          italianNutritionValues.get("CARBOIDRATI G") ??
          null
  );
  const nutritionFat = sanitizePercentValue(
    nutritionSection
      ? (nutritionTableValues.get("FAT") ??
        nutritionalInformationValues.get("FAT (G)") ??
        italianNutritionValues.get("GRASSI G") ??
        compactNutritionTableValues.get("FAT") ??
        sequentialNutritionTableValues.get("FAT") ??
        inlineNutritionValues.get("FAT") ??
        anchoredNutritionTableValues.get("FAT") ??
        anchoredNutritionalInformationValues.get("FAT (G)") ??
        extractMetricValue(nutritionSection, ["GRASSI G", "FAT (G)", "FAT", "FATS"]))
      : anchoredNutritionTableValues.get("FAT") ??
          anchoredNutritionalInformationValues.get("FAT (G)") ??
          italianNutritionValues.get("GRASSI G") ??
          null
  );
  const nutritionSugar = sanitizePercentValue(
    nutritionSection
      ? (nutritionCarbohydrates ??
        italianNutritionValues.get("CARBOIDRATI G") ??
        italianNutritionValues.get("DI CUI ZUCCHERI G") ??
        compactNutritionTableValues.get("CARBOHYDRATES") ??
        sequentialNutritionTableValues.get("CARBOHYDRATES") ??
        inlineNutritionValues.get("CARBOHYDRATES") ??
        anchoredNutritionTableValues.get("CARBOHYDRATES") ??
        anchoredNutritionalInformationValues.get("CARBOHYDRATES (G)") ??
        extractMetricValue(nutritionSection, [
          "DI CUI ZUCCHERI G",
          "CARBOIDRATI G",
          "CARBOHYDRATES (G)",
          "SUGARS",
          "SUGAR",
          "CARBOHYDRATES",
        ]))
      : anchoredNutritionTableValues.get("CARBOHYDRATES") ??
          anchoredNutritionalInformationValues.get("CARBOHYDRATES (G)") ??
          italianNutritionValues.get("DI CUI ZUCCHERI G") ??
          italianNutritionValues.get("CARBOIDRATI G") ??
          null
  );
  const proteinG =
    sanitizePercentValue(
      nutritionSection
        ? (nutritionTableValues.get("PROTEIN") ??
          nutritionalInformationValues.get("PROTEIN (G)") ??
          italianNutritionValues.get("PROTEINE G") ??
          compactNutritionTableValues.get("PROTEIN") ??
          sequentialNutritionTableValues.get("PROTEIN") ??
          inlineNutritionValues.get("PROTEIN") ??
          anchoredNutritionTableValues.get("PROTEIN") ??
          anchoredNutritionalInformationValues.get("PROTEIN (G)") ??
          extractMetricValue(nutritionSection, ["PROTEINE G", "PROTEIN (G)", "PROTEIN", "PROTEINS"]))
        : anchoredNutritionTableValues.get("PROTEIN") ??
            anchoredNutritionalInformationValues.get("PROTEIN (G)") ??
            italianNutritionValues.get("PROTEINE G") ??
            null
    ) ?? 0;
  const ashG =
    sanitizePercentValue(
      nutritionSection
        ? (nutritionalInformationValues.get("ASH (G)") ??
          italianNutritionValues.get("SALE G") ??
          extractMetricValue(nutritionSection, ["SALE G", "ASH (G)", "ASH"]))
        : null
    ) ?? 0;
  const moisturePct =
    sanitizePercentValue(
      nutritionSection
        ? (nutritionalInformationValues.get("MOISTURE (%)") ??
          extractMetricValue(nutritionSection, ["MOISTURE (%)", "MOISTURE"]))
        : null
    ) ?? 0;
  const kcalPer100g =
    (nutritionSection
      ? (nutritionTableValues.get("ENERGY VALUE") ??
        nutritionalInformationValues.get("CALORIES (KCAL)") ??
        italianNutritionValues.get("ENERGIA KCAL") ??
        compactNutritionTableValues.get("ENERGY VALUE") ??
        sequentialNutritionTableValues.get("ENERGY VALUE") ??
        inlineNutritionValues.get("ENERGY VALUE") ??
        anchoredNutritionTableValues.get("ENERGY VALUE") ??
        anchoredNutritionalInformationValues.get("CALORIES (KCAL)") ??
        extractMetricValue(nutritionSection, ["ENERGIA KCAL", "CALORIES (KCAL)", "KCAL", "ENERGY"]))
      : anchoredNutritionTableValues.get("ENERGY VALUE") ??
          anchoredNutritionalInformationValues.get("CALORIES (KCAL)") ??
          italianNutritionValues.get("ENERGIA KCAL") ??
          null) ?? 0;
  const extractionSource = hasBalancingValues ? "Balancing Parameters" : "Nutritional Fallback";
  const isFunctionalBase = category === "Base/Stabilizer" || category === "Base";
  const fatPct = balancingFat ?? nutritionFat ?? (isFunctionalBase ? 0 : 0);
  const fatPctResolved = pregelFat ?? fatPct;
  const sugarPct = pregelSugar ?? balancingSugar ?? nutritionSugar ?? (isFunctionalBase ? 0 : 0);
  const totalSolidsPct =
    (pregelMoisture !== null
      ? Math.round((100 - pregelMoisture) * 100) / 100
      : null) ??
    balancingSolids ??
    (hasNutritionValues || anchoredNutritionTableValues.size || anchoredNutritionalInformationValues.size
      ? moisturePct > 0
        ? Math.round((100 - moisturePct) * 100) / 100
        : Math.round(((fatPctResolved + (nutritionCarbohydrates ?? sugarPct) + proteinG + (ashG || 0)) * 100)) /
            100
      : 0);
  const dosageGuideline = extractDosageForGelato(instructionsSection ?? rawText);
  const explicitPac = extractNumberByLabel(normalizedText, ["PAC"]);
  const explicitPod = extractNumberByLabel(normalizedText, ["POD"]);
  const msnfPct = proteinG;
  const derivedPacPod = derivePacPod({
    sugarPct,
    proteinG,
  });
  const confidenceScore = calculateConfidenceScore({
    productCode,
    fatPct: fatPctResolved,
    sugarPct,
    totalSolidsPct,
    revisionDate,
    extractionSource,
  });
  if (!hasBalancingValues) {
    warningFlags.push("balancing_parameters_missing");
  }

  if (!hasNutritionValues) {
    warningFlags.push("nutrition_labelling_missing");
  }

  if (!productCode) {
    warningFlags.push("product_code_missing");
  }

  if (isFunctionalBase && !dosageGuideline) {
    warningFlags.push("dosage_for_gelato_missing");
  }

  if (extractionSource === "Nutritional Fallback" && hasNutritionValues) {
    warningFlags.push("verified_nutritional_fallback");
  }

  if (isFunctionalBase && !hasBalancingValues && !hasNutritionValues && dosageGuideline) {
    warningFlags.push("verified_functional_base");
  }

  const needsManualReview =
    (isFunctionalBase && !hasBalancingValues && !hasNutritionValues && !dosageGuideline) ||
    (!(fatPctResolved > 0 && totalSolidsPct > 0 && sugarPct >= 0) &&
      !(isFunctionalBase && Boolean(dosageGuideline))) ||
    confidenceScore < 75;

  return {
    rawText,
    confidenceScore,
    needsManualReview,
    warningFlags,
    debug: {
      balancingSection,
      nutritionSection,
      balancingValues: {
        ...mapToRecord(balancingTableValues),
        ...mapToRecord(compactBalancingTableValues),
        ...mapToRecord(sequentialBalancingTableValues),
        ...mapToRecord(inlineBalancingValues),
        ...mapToRecord(anchoredBalancingTableValues),
      },
      nutritionValues: {
        ...mapToRecord(nutritionTableValues),
        ...mapToRecord(nutritionalInformationValues),
        ...mapToRecord(italianNutritionValues),
        ...mapToRecord(compactNutritionTableValues),
        ...mapToRecord(sequentialNutritionTableValues),
        ...mapToRecord(inlineNutritionValues),
        ...mapToRecord(anchoredNutritionTableValues),
        ...mapToRecord(anchoredNutritionalInformationValues),
      },
    },
    extracted: {
      name,
      brand_name: brandName,
      product_code: productCode,
      upc,
      revision_date: revisionDate,
      category,
      is_dairy: isDairy,
      fat_pct: fatPctResolved,
      sugar_pct: sugarPct,
      total_solids_pct: totalSolidsPct,
      msnf_pct: msnfPct,
      protein_g: proteinG,
      kcal_per_100g: kcalPer100g,
      dosage_guideline: dosageGuideline,
      cost_per_kg: 0,
      average_market_cost: 0,
      cost_per_container: 0,
      container_size_g: 1000,
      pac_value: explicitPac ?? derivedPacPod.pac_value,
      pod_value: explicitPod ?? derivedPacPod.pod_value,
      extraction_source: extractionSource,
      is_cold_process: inferProcessMode(normalizedText),
    },
  };
  } catch {
    return createFallbackParsedResult(rawText, ["parser_exception"], fileName);
  }
}

async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf");

  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js";
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const pdfDocument = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const textItems = textContent.items
      .map((item) => {
        if (!("str" in item)) {
          return null;
        }

        return {
          text: item.str,
          x: item.transform[4] ?? 0,
          y: item.transform[5] ?? 0,
        };
      })
      .filter((item): item is { text: string; x: number; y: number } => Boolean(item))
      .sort((left, right) => {
        if (Math.abs(left.y - right.y) > 2) {
          return right.y - left.y;
        }

        return left.x - right.x;
      });

    const lines: string[] = [];
    let currentLine = "";
    let currentY: number | null = null;

    for (const item of textItems) {
      if (currentY === null || Math.abs(item.y - currentY) > 2) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }

        currentLine = item.text;
        currentY = item.y;
        continue;
      }

      currentLine += `${currentLine ? " " : ""}${item.text}`;
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    const text = lines.join("\n");

    pages.push(text);
  }

  const extractedText = normalizeWhitespace(pages.join("\n"));

  if (typeof window === "undefined" || !hasWeakPdfTextLayer(extractedText)) {
    return {
      text: extractedText,
      usedOcrFallback: false,
    };
  }

  try {
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return {
        text: extractedText,
        usedOcrFallback: false,
      };
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");

    try {
      const result = await worker.recognize(canvas);
      const ocrText = normalizeWhitespace(result.data.text ?? "");

      return {
        text: normalizeWhitespace([extractedText, ocrText].filter(Boolean).join("\n")),
        usedOcrFallback: Boolean(ocrText),
      };
    } finally {
      await worker.terminate();
    }
  } catch {
    return {
      text: extractedText,
      usedOcrFallback: false,
    };
  }
}

export async function processIngredientPDF(file: File): Promise<ParsedIngredientPdf> {
  try {
    const { text, usedOcrFallback } = await extractPdfText(file);
    const isPreGelDocument = isPreGelTechnicalSheet(text);
    const parsed = parsePreGelTechnicalSheet(text, file.name);

    if (isPreGelDocument && !usedOcrFallback) {
      return parsed;
    }

    if (!usedOcrFallback) {
      return parsed;
    }

    return {
      ...parsed,
      warningFlags: [...parsed.warningFlags, "ocr_fallback_used"],
    };
  } catch {
    return createFallbackParsedResult("", ["pdf_text_extraction_failed"], file.name);
  }
}
