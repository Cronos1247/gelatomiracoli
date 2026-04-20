import { mobileSupabase } from "./supabase";

export type EquipmentUnitRecord = {
  id: string;
  brand: string;
  model: string;
  min_batch_l: number;
  max_batch_l: number;
};

export type DisplayCaseRecord = {
  id: string;
  name: string;
  capacity_pans: number;
  target_temp_c: number;
  pac_range_min: number;
  pac_range_max: number;
  display_order: number;
  style: "Traditional" | "Pozzetti";
};

export type EquipmentSettingsSnapshot = {
  units: EquipmentUnitRecord[];
  displayCases: DisplayCaseRecord[];
};

const FALLBACK_UNITS: EquipmentUnitRecord[] = [
  {
    id: "fallback-bravo-trittico",
    brand: "Bravo",
    model: "Trittico 5L",
    min_batch_l: 1,
    max_batch_l: 5,
  },
];

const FALLBACK_CASES: DisplayCaseRecord[] = [
  {
    id: "fallback-front-window",
    name: "Front Window Case",
    capacity_pans: 24,
    target_temp_c: -15,
    pac_range_min: 280,
    pac_range_max: 999,
    display_order: 0,
    style: "Traditional",
  },
];

function normalizeNumber(value: unknown, fallback: number) {
  const next = typeof value === "number" ? value : Number(value ?? fallback);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeUnit(record: Record<string, unknown>): EquipmentUnitRecord {
  return {
    id: typeof record.id === "string" ? record.id : `unit-${Math.random().toString(36).slice(2)}`,
    brand: typeof record.brand === "string" ? record.brand : "Custom",
    model: typeof record.model === "string" ? record.model : "Batch Freezer",
    min_batch_l: normalizeNumber(record.min_batch_l, 1),
    max_batch_l: normalizeNumber(
      record.max_batch_l,
      normalizeNumber(record.max_batch_kg, 5)
    ),
  };
}

function normalizeDisplayCase(record: Record<string, unknown>, index: number): DisplayCaseRecord {
  const rawStyle = typeof record.style === "string" ? record.style : "Traditional";

  return {
    id:
      typeof record.id === "string" ? record.id : `display-case-${Math.random().toString(36).slice(2)}`,
    name: typeof record.name === "string" ? record.name : `Display Case ${index + 1}`,
    capacity_pans: normalizeNumber(record.capacity_pans, 12),
    target_temp_c: normalizeNumber(record.target_temp_c, -15),
    pac_range_min: normalizeNumber(record.pac_range_min, 280),
    pac_range_max: normalizeNumber(record.pac_range_max, 400),
    display_order: normalizeNumber(record.display_order, index),
    style: rawStyle === "Pozzetti" ? "Pozzetti" : "Traditional",
  };
}

export async function loadEquipmentSettings(): Promise<EquipmentSettingsSnapshot> {
  if (!mobileSupabase) {
    return {
      units: FALLBACK_UNITS,
      displayCases: FALLBACK_CASES,
    };
  }

  const [equipmentResponse, caseResponse] = await Promise.all([
    mobileSupabase.from("equipment").select("*").order("brand", { ascending: true }),
    mobileSupabase.from("display_cases").select("*").order("display_order", { ascending: true }),
  ]);

  return {
    units:
      equipmentResponse.data && !equipmentResponse.error && equipmentResponse.data.length > 0
        ? equipmentResponse.data.map((row) => normalizeUnit(row as Record<string, unknown>))
        : FALLBACK_UNITS,
    displayCases:
      caseResponse.data && !caseResponse.error && caseResponse.data.length > 0
        ? caseResponse.data.map((row, index) =>
            normalizeDisplayCase(row as Record<string, unknown>, index)
          )
        : FALLBACK_CASES,
  };
}

export async function saveEquipmentSettings(snapshot: EquipmentSettingsSnapshot) {
  if (!mobileSupabase) {
    throw new Error("Supabase is not configured for equipment sync.");
  }

  const existingEquipment = await mobileSupabase.from("equipment").select("id");
  if (existingEquipment.error) {
    throw new Error(existingEquipment.error.message);
  }

  const existingCases = await mobileSupabase.from("display_cases").select("id");
  if (existingCases.error) {
    throw new Error(existingCases.error.message);
  }

  const nextEquipment = snapshot.units.map((unit) => ({
    id: unit.id.startsWith("fallback-") ? undefined : unit.id,
    brand: unit.brand.trim() || "Custom",
    model: unit.model.trim() || "Batch Freezer",
    min_batch_l: unit.min_batch_l,
    max_batch_l: unit.max_batch_l,
    max_batch_kg: unit.max_batch_l,
    heating_capability: true,
    default_overrun_pct: 30,
  }));

  const nextCases = snapshot.displayCases.map((displayCase, index) => ({
    id: displayCase.id.startsWith("fallback-") ? undefined : displayCase.id,
    name: displayCase.name.trim() || `Display Case ${index + 1}`,
    capacity_pans: displayCase.capacity_pans,
    target_temp_c: displayCase.target_temp_c,
    pac_range_min: displayCase.pac_range_min,
    pac_range_max: displayCase.pac_range_max,
    display_order: index,
    style: displayCase.style,
  }));

  const equipmentIdsToKeep = nextEquipment
    .map((unit) => unit.id)
    .filter((value): value is string => typeof value === "string");
  const caseIdsToKeep = nextCases
    .map((displayCase) => displayCase.id)
    .filter((value): value is string => typeof value === "string");

  const equipmentIdsToDelete = (existingEquipment.data ?? [])
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string" && !equipmentIdsToKeep.includes(id));
  const caseIdsToDelete = (existingCases.data ?? [])
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string" && !caseIdsToKeep.includes(id));

  if (equipmentIdsToDelete.length > 0) {
    const { error } = await mobileSupabase.from("equipment").delete().in("id", equipmentIdsToDelete);
    if (error) {
      throw new Error(error.message);
    }
  }

  if (caseIdsToDelete.length > 0) {
    const { error } = await mobileSupabase.from("display_cases").delete().in("id", caseIdsToDelete);
    if (error) {
      throw new Error(error.message);
    }
  }

  const { error: equipmentUpsertError } = await mobileSupabase
    .from("equipment")
    .upsert(nextEquipment, { onConflict: "id" });
  if (equipmentUpsertError) {
    throw new Error(equipmentUpsertError.message);
  }

  const { error: caseUpsertError } = await mobileSupabase
    .from("display_cases")
    .upsert(nextCases, { onConflict: "id" });
  if (caseUpsertError) {
    throw new Error(caseUpsertError.message);
  }
}
