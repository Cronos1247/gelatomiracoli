export type FoundationIngredient = {
  name: string;
  category: string;
  pac: number;
  pod: number;
  solids_percent: number;
  fat_percent: number;
  water_percent: number;
  is_dairy: boolean;
};

export const FOUNDATION_INGREDIENTS: FoundationIngredient[] = [
  {
    name: "Sucrose",
    category: "Sugar",
    pac: 100,
    pod: 100,
    solids_percent: 100,
    fat_percent: 0,
    water_percent: 0,
    is_dairy: false,
  },
  {
    name: "Dextrose",
    category: "Sugar",
    pac: 190,
    pod: 70,
    solids_percent: 100,
    fat_percent: 0,
    water_percent: 0,
    is_dairy: false,
  },
  {
    name: "Skim Milk Powder (SMP)",
    category: "Structure",
    pac: 0,
    pod: 0,
    solids_percent: 97,
    fat_percent: 1,
    water_percent: 3,
    is_dairy: true,
  },
  {
    name: "Raw Stabilizer (LBG/Guar)",
    category: "Structure",
    pac: 0,
    pod: 0,
    solids_percent: 100,
    fat_percent: 0,
    water_percent: 0,
    is_dairy: false,
  },
  {
    name: "Water",
    category: "Liquid",
    pac: 0,
    pod: 0,
    solids_percent: 0,
    fat_percent: 0,
    water_percent: 100,
    is_dairy: false,
  },
  {
    name: "Whole Milk (3.5%)",
    category: "Liquid",
    pac: 0,
    pod: 0,
    solids_percent: 12.5,
    fat_percent: 3.5,
    water_percent: 87.5,
    is_dairy: true,
  },
  {
    name: "Fresh Strawberry",
    category: "Fresh Fruit",
    pac: 7,
    pod: 7,
    solids_percent: 10,
    fat_percent: 0,
    water_percent: 90,
    is_dairy: false,
  },
];
