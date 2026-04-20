export type IngredientCategory =
  | "Base"
  | "Sugar"
  | "Nut"
  | "Chocolate"
  | "Dairy"
  | "Base/Stabilizer"
  | "Flavor Paste"
  | "Other";
export type ProcessType = "Hot" | "Cold";
export type BaseType = "Hot" | "Cold";
export type DisplayType = "Standard Case" | "Pozzetti";
export type FlavorKey =
  | "fior-di-latte"
  | "pistachio"
  | "gianduja"
  | "dark-chocolate"
  | "strawberry";
export type SugarOption =
  | "Sucrose"
  | "Dextrose"
  | "Invert Sugar"
  | "Polydextrose"
  | "Maltodextrin";
export type ProxySugarModel = "Sucrose" | "Dextrose" | "Lactose";
export type IngredientDataPriority =
  | "verified_lab_data"
  | "proxy_mode"
  | "industry_average";

export type Ingredient = {
  id: string;
  name: string;
  name_en?: string | null;
  name_es?: string | null;
  name_it?: string | null;
  brand_name?: string | null;
  product_code?: string | null;
  upc?: string | null;
  revision_date?: string | null;
  category: IngredientCategory;
  fat_pct: number;
  sugar_pct: number;
  total_solids_pct?: number | null;
  msnf_pct?: number | null;
  solids_non_fat_pct: number;
  other_solids_pct: number;
  pac_value: number;
  pod_value: number;
  cost_per_kg: number;
  average_market_cost?: number | null;
  is_cold_process: boolean;
  is_base_ingredient: boolean;
  is_master: boolean;
  dosage_guideline?: number | null;
  pdf_url?: string | null;
  raw_ocr_dump?: string | null;
  extraction_source?: "Balancing Parameters" | "Nutritional Fallback" | null;
  user_id: string | null;
  data_priority: IngredientDataPriority;
};

export type Stabilizer = {
  id: string;
  brand_name: string;
  product_name: string;
  dosage_range_min: number;
  dosage_range_max: number;
  process_type: ProcessType;
};

export type Equipment = {
  id: string;
  brand: string;
  model: string;
  machine_type: string;
  heating_capability: boolean;
  max_batch_kg: number;
  default_overrun_pct: number;
};

export type AppSettingRecord = {
  id: string;
  user_id: string | null;
  display_type: DisplayType;
  equipment_id: string | null;
  lab_name: string | null;
  logo_url: string | null;
  available_sugars: SugarOption[];
  language?: string | null;
};

export type FixedFlavorIngredient = {
  name: string;
  grams_per_kg_mix: number;
  fat_pct: number;
  sugar_pct: number;
  solids_non_fat_pct: number;
  other_solids_pct: number;
  pac_value: number;
  pod_value: number;
  cost_per_kg: number;
};

export type FlavorProfile = {
  key: FlavorKey;
  label: string;
  notes: string;
  targetFatPct: number;
  targetPac: number;
  targetPodPct: number;
  targetSolidsPct: number;
  fixedIngredients: FixedFlavorIngredient[];
};

export type CustomIngredientInput = {
  id: string;
  ingredient: Ingredient;
  grams_per_kg_mix: number;
  enabled: boolean;
};

export const displayTypePacRanges: Record<DisplayType, { min: number; max: number }> = {
  Pozzetti: { min: 210, max: 230 },
  "Standard Case": { min: 240, max: 270 },
};

export const proxySugarModels: Record<
  ProxySugarModel,
  {
    pacCoefficient: number;
    podCoefficient: number;
    label: string;
  }
> = {
  Sucrose: {
    pacCoefficient: 1,
    podCoefficient: 1,
    label: "Classic sucrose-style sweetness and PAC",
  },
  Dextrose: {
    pacCoefficient: 1.9,
    podCoefficient: 0.7,
    label: "Higher PAC with lower sweetness, useful for colder service",
  },
  Lactose: {
    pacCoefficient: 1,
    podCoefficient: 0.16,
    label: "Low sweetness dairy-style proxy for softer milk solids behavior",
  },
};

export const sugarOptions: SugarOption[] = [
  "Sucrose",
  "Dextrose",
  "Invert Sugar",
  "Polydextrose",
  "Maltodextrin",
];

export const defaultIngredients: Ingredient[] = [
  {
    id: "whole-milk",
    name: "Whole Milk",
    category: "Base",
    fat_pct: 3.5,
    sugar_pct: 4.5,
    total_solids_pct: 16.5,
    solids_non_fat_pct: 8.5,
    other_solids_pct: 0,
    pac_value: 100,
    pod_value: 100,
    cost_per_kg: 1.25,
    is_cold_process: true,
    is_base_ingredient: true,
    is_master: true,
    dosage_guideline: null,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "heavy-cream",
    name: "Heavy Cream",
    category: "Base",
    fat_pct: 35,
    sugar_pct: 3,
    total_solids_pct: 43,
    solids_non_fat_pct: 5,
    other_solids_pct: 0,
    pac_value: 100,
    pod_value: 100,
    cost_per_kg: 4.6,
    is_cold_process: true,
    is_base_ingredient: true,
    is_master: true,
    dosage_guideline: null,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "sucrose",
    name: "Sucrose",
    category: "Sugar",
    fat_pct: 0,
    sugar_pct: 100,
    total_solids_pct: 100,
    solids_non_fat_pct: 0,
    other_solids_pct: 0,
    pac_value: 100,
    pod_value: 100,
    cost_per_kg: 1.6,
    is_cold_process: true,
    is_base_ingredient: true,
    is_master: true,
    dosage_guideline: null,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "dextrose",
    name: "Dextrose",
    category: "Sugar",
    fat_pct: 0,
    sugar_pct: 95,
    total_solids_pct: 95,
    solids_non_fat_pct: 0,
    other_solids_pct: 0,
    pac_value: 190,
    pod_value: 70,
    cost_per_kg: 2.8,
    is_cold_process: true,
    is_base_ingredient: true,
    is_master: true,
    dosage_guideline: null,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "invert-sugar",
    name: "Invert Sugar",
    category: "Sugar",
    fat_pct: 0,
    sugar_pct: 80,
    total_solids_pct: 80,
    solids_non_fat_pct: 0,
    other_solids_pct: 0,
    pac_value: 150,
    pod_value: 125,
    cost_per_kg: 3.2,
    is_cold_process: true,
    is_base_ingredient: true,
    is_master: true,
    dosage_guideline: null,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "polydextrose",
    name: "Polydextrose",
    category: "Sugar",
    fat_pct: 0,
    sugar_pct: 5,
    total_solids_pct: 95,
    solids_non_fat_pct: 0,
    other_solids_pct: 90,
    pac_value: 15,
    pod_value: 7,
    cost_per_kg: 4.4,
    is_cold_process: true,
    is_base_ingredient: true,
    is_master: true,
    dosage_guideline: null,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "nfdm",
    name: "NFDM",
    category: "Base",
    fat_pct: 0.8,
    sugar_pct: 50,
    total_solids_pct: 96,
    solids_non_fat_pct: 45.2,
    other_solids_pct: 0,
    pac_value: 100,
    pod_value: 16,
    cost_per_kg: 5.4,
    is_cold_process: true,
    is_base_ingredient: true,
    is_master: true,
    dosage_guideline: null,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "generic-cocoa-powder",
    name: "Cocoa Powder (22/24)",
    category: "Flavor Paste",
    fat_pct: 23,
    sugar_pct: 0,
    total_solids_pct: 97,
    solids_non_fat_pct: 0,
    other_solids_pct: 74,
    pac_value: 0,
    pod_value: 0,
    cost_per_kg: 9.2,
    is_cold_process: true,
    is_base_ingredient: false,
    is_master: true,
    dosage_guideline: 22,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "generic-dark-chocolate-70",
    name: "Dark Chocolate (70%)",
    category: "Flavor Paste",
    fat_pct: 42,
    sugar_pct: 29,
    total_solids_pct: 99,
    solids_non_fat_pct: 0,
    other_solids_pct: 28,
    pac_value: 29,
    pod_value: 29,
    cost_per_kg: 12.5,
    is_cold_process: true,
    is_base_ingredient: false,
    is_master: true,
    dosage_guideline: 120,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "generic-milk-chocolate-standard",
    name: "Milk Chocolate (Standard)",
    category: "Flavor Paste",
    fat_pct: 35,
    sugar_pct: 50,
    total_solids_pct: 99,
    solids_non_fat_pct: 0,
    other_solids_pct: 14,
    pac_value: 50,
    pod_value: 50,
    cost_per_kg: 10.8,
    is_cold_process: true,
    is_base_ingredient: false,
    is_master: true,
    dosage_guideline: 90,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "generic-pistachio-pure",
    name: "Pistachio Pure (Generic)",
    category: "Flavor Paste",
    fat_pct: 45,
    sugar_pct: 5,
    total_solids_pct: 98,
    solids_non_fat_pct: 0,
    other_solids_pct: 48,
    pac_value: 55,
    pod_value: 42,
    cost_per_kg: 28,
    is_cold_process: true,
    is_base_ingredient: false,
    is_master: true,
    dosage_guideline: 100,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "generic-hazelnut-pure",
    name: "Hazelnut Paste (Pure)",
    category: "Flavor Paste",
    fat_pct: 62,
    sugar_pct: 5,
    total_solids_pct: 99,
    solids_non_fat_pct: 0,
    other_solids_pct: 32,
    pac_value: 5,
    pod_value: 5,
    cost_per_kg: 26,
    is_cold_process: true,
    is_base_ingredient: false,
    is_master: true,
    dosage_guideline: 90,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "fresh-strawberry",
    name: "Strawberry (Fresh/Puree)",
    category: "Other",
    fat_pct: 0.4,
    sugar_pct: 7,
    total_solids_pct: 10,
    solids_non_fat_pct: 0,
    other_solids_pct: 2.6,
    pac_value: 7,
    pod_value: 7,
    cost_per_kg: 5.8,
    is_cold_process: true,
    is_base_ingredient: false,
    is_master: true,
    dosage_guideline: 260,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "mango-alphonso-puree",
    name: "Mango (Alphonso Puree)",
    category: "Other",
    fat_pct: 0.4,
    sugar_pct: 15,
    total_solids_pct: 20,
    solids_non_fat_pct: 0,
    other_solids_pct: 4.6,
    pac_value: 15,
    pod_value: 15,
    cost_per_kg: 8.4,
    is_cold_process: true,
    is_base_ingredient: false,
    is_master: true,
    dosage_guideline: 260,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "lemon-juice",
    name: "Lemon Juice",
    category: "Other",
    fat_pct: 0,
    sugar_pct: 2,
    total_solids_pct: 8,
    solids_non_fat_pct: 0,
    other_solids_pct: 6,
    pac_value: 2,
    pod_value: 2,
    cost_per_kg: 4.1,
    is_cold_process: true,
    is_base_ingredient: false,
    is_master: true,
    dosage_guideline: 160,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "heavy-cream-36",
    name: "Heavy Cream (36%)",
    category: "Dairy",
    fat_pct: 36,
    sugar_pct: 3,
    total_solids_pct: 41,
    solids_non_fat_pct: 5,
    other_solids_pct: 0,
    pac_value: 80,
    pod_value: 10,
    cost_per_kg: 4.75,
    is_cold_process: true,
    is_base_ingredient: true,
    is_master: true,
    dosage_guideline: null,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "skim-milk-powder-nfdm",
    name: "Skim Milk Powder (NFDM)",
    category: "Dairy",
    fat_pct: 0.8,
    sugar_pct: 50,
    total_solids_pct: 97,
    solids_non_fat_pct: 46.2,
    other_solids_pct: 0,
    pac_value: 100,
    pod_value: 16,
    cost_per_kg: 5.4,
    is_cold_process: true,
    is_base_ingredient: true,
    is_master: true,
    dosage_guideline: null,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
  {
    id: "maltodextrin-de19",
    name: "Maltodextrin (DE19)",
    category: "Sugar",
    fat_pct: 0,
    sugar_pct: 5,
    total_solids_pct: 95,
    solids_non_fat_pct: 0,
    other_solids_pct: 90,
    pac_value: 20,
    pod_value: 10,
    cost_per_kg: 3.6,
    is_cold_process: true,
    is_base_ingredient: true,
    is_master: true,
    dosage_guideline: null,
    pdf_url: null,
    user_id: null,
    data_priority: "industry_average",
  },
];

export const defaultStabilizers: Stabilizer[] = [
  {
    id: "stabilizer-hot-1",
    brand_name: "Cremodan",
    product_name: "Gelato 30 Hot",
    dosage_range_min: 0.32,
    dosage_range_max: 0.45,
    process_type: "Hot",
  },
  {
    id: "stabilizer-hot-2",
    brand_name: "Pregel",
    product_name: "SuperNeutro Hot",
    dosage_range_min: 0.35,
    dosage_range_max: 0.5,
    process_type: "Hot",
  },
  {
    id: "stabilizer-cold-1",
    brand_name: "Neutro",
    product_name: "Cold Process 5",
    dosage_range_min: 0.35,
    dosage_range_max: 0.48,
    process_type: "Cold",
  },
];

export const defaultEquipment: Equipment[] = [
  {
    id: "bravo-trittico",
    brand: "Bravo",
    model: "Trittico",
    machine_type: "Vertical/Multi",
    heating_capability: true,
    max_batch_kg: 6,
    default_overrun_pct: 30,
  },
  {
    id: "carpigiani-labotronic-he",
    brand: "Carpigiani",
    model: "Labotronic HE",
    machine_type: "Horizontal",
    heating_capability: false,
    max_batch_kg: 5.5,
    default_overrun_pct: 25,
  },
  {
    id: "cattabriga-effe",
    brand: "Cattabriga",
    model: "Effe",
    machine_type: "Vertical",
    heating_capability: false,
    max_batch_kg: 4.75,
    default_overrun_pct: 20,
  },
  {
    id: "taylor-c709",
    brand: "Taylor",
    model: "C709",
    machine_type: "Continuous",
    heating_capability: false,
    max_batch_kg: 4,
    default_overrun_pct: 24,
  },
  {
    id: "musso-polafric",
    brand: "Musso",
    model: "Polafric Stella Chef",
    machine_type: "Tabletop",
    heating_capability: false,
    max_batch_kg: 2.5,
    default_overrun_pct: 22,
  },
];

export const defaultSettings: AppSettingRecord = {
  id: "default-settings",
  user_id: null,
  display_type: "Standard Case",
  equipment_id: defaultEquipment[0].id,
  lab_name: "Miracoli Lab",
  logo_url: null,
  available_sugars: sugarOptions,
  language: "en",
};

export const flavorProfiles: Record<FlavorKey, FlavorProfile> = {
  "fior-di-latte": {
    key: "fior-di-latte",
    label: "Fior di Latte",
    notes: "Clean dairy profile with a smooth scoop and low aromatic solids.",
    targetFatPct: 8.8,
    targetPac: 238,
    targetPodPct: 16.4,
    targetSolidsPct: 37.1,
    fixedIngredients: [],
  },
  pistachio: {
    key: "pistachio",
    label: "Pistachio Sicilia",
    notes: "Nut-forward profile with dense body and creamy pistachio finish.",
    targetFatPct: 9.8,
    targetPac: 244,
    targetPodPct: 16.6,
    targetSolidsPct: 38.2,
    fixedIngredients: [
      {
        name: "Pistachio Paste",
        grams_per_kg_mix: 100,
        fat_pct: 45,
        sugar_pct: 10,
        solids_non_fat_pct: 8,
        other_solids_pct: 22,
        pac_value: 55,
        pod_value: 42,
        cost_per_kg: 28,
      },
    ],
  },
  gianduja: {
    key: "gianduja",
    label: "Gianduja",
    notes: "Hazelnut chocolate profile that wants richer sweetness support.",
    targetFatPct: 10.4,
    targetPac: 248,
    targetPodPct: 17.1,
    targetSolidsPct: 38.8,
    fixedIngredients: [
      {
        name: "Hazelnut Paste",
        grams_per_kg_mix: 90,
        fat_pct: 42,
        sugar_pct: 10,
        solids_non_fat_pct: 8,
        other_solids_pct: 24,
        pac_value: 52,
        pod_value: 40,
        cost_per_kg: 24,
      },
      {
        name: "Milk Chocolate",
        grams_per_kg_mix: 55,
        fat_pct: 31,
        sugar_pct: 50,
        solids_non_fat_pct: 5,
        other_solids_pct: 10,
        pac_value: 108,
        pod_value: 96,
        cost_per_kg: 10.5,
      },
    ],
  },
  "dark-chocolate": {
    key: "dark-chocolate",
    label: "Fondente 70%",
    notes: "Bold cocoa structure that benefits from a slightly warmer sweetness curve.",
    targetFatPct: 9.1,
    targetPac: 252,
    targetPodPct: 17.6,
    targetSolidsPct: 39.2,
    fixedIngredients: [
      {
        name: "Dark Chocolate 70%",
        grams_per_kg_mix: 120,
        fat_pct: 32,
        sugar_pct: 38,
        solids_non_fat_pct: 8,
        other_solids_pct: 20,
        pac_value: 96,
        pod_value: 82,
        cost_per_kg: 12.5,
      },
      {
        name: "Cocoa Powder",
        grams_per_kg_mix: 22,
        fat_pct: 11,
        sugar_pct: 1,
        solids_non_fat_pct: 20,
        other_solids_pct: 62,
        pac_value: 12,
        pod_value: 4,
        cost_per_kg: 9.2,
      },
    ],
  },
  strawberry: {
    key: "strawberry",
    label: "Fresh Strawberry Sorbet",
    notes: "Bright fruit profile with low fat and clean sorbet solids.",
    targetFatPct: 0.5,
    targetPac: 290,
    targetPodPct: 28,
    targetSolidsPct: 31,
    fixedIngredients: [
      {
        name: "Strawberry (Fresh/Puree)",
        grams_per_kg_mix: 260,
        fat_pct: 0.4,
        sugar_pct: 7,
        solids_non_fat_pct: 0,
        other_solids_pct: 2.6,
        pac_value: 7,
        pod_value: 7,
        cost_per_kg: 5.8,
      },
    ],
  },
};
