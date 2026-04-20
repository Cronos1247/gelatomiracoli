import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EquipmentCommandCenter, type EquipmentModule } from "@/components/portal/EquipmentCommandCenter";

type EquipmentRow = {
  id: string;
  brand: string | null;
  model: string | null;
  min_batch_l?: number | null;
  max_batch_l?: number | null;
  max_batch_kg?: number | null;
};

type DisplayCaseRow = {
  id: string;
  name: string | null;
  style?: string | null;
  target_temp_c?: number | null;
};

const FALLBACK_MODULES: EquipmentModule[] = [
  {
    id: "fallback-display",
    title: "Front Window Case",
    subtitle: "Style: Traditional",
    type: "display",
    temperatureC: -15,
  },
  {
    id: "fallback-production",
    title: "Bravo Trittico 5L",
    subtitle: "Production Unit",
    type: "production",
    minBatchL: 1,
    maxBatchL: 5,
  },
];

function normalizeNumber(value: unknown, fallback: number) {
  const next = typeof value === "number" ? value : Number(value ?? fallback);
  return Number.isFinite(next) ? next : fallback;
}

export const dynamic = "force-dynamic";

export default async function PortalEquipmentPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return <EquipmentCommandCenter modules={FALLBACK_MODULES} />;
  }

  const [equipmentResult, displayCaseResult] = await Promise.all([
    supabase.from("equipment").select("*").order("brand", { ascending: true }),
    supabase.from("display_cases").select("*").order("display_order", { ascending: true }),
  ]);

  const modules: EquipmentModule[] = [];

  if (!displayCaseResult.error) {
    for (const row of (displayCaseResult.data ?? []) as DisplayCaseRow[]) {
      modules.push({
        id: row.id,
        title: row.name ?? "Display Case",
        subtitle: `Style: ${row.style ?? "Traditional"}`,
        type: "display",
        temperatureC: normalizeNumber(row.target_temp_c, -15),
      });
    }
  }

  if (!equipmentResult.error) {
    for (const row of (equipmentResult.data ?? []) as EquipmentRow[]) {
      modules.push({
        id: row.id,
        title: [row.brand, row.model].filter(Boolean).join(" ") || "Batch Freezer",
        subtitle: "Production Unit",
        type: "production",
        minBatchL: normalizeNumber(row.min_batch_l, 1),
        maxBatchL: normalizeNumber(row.max_batch_l ?? row.max_batch_kg, 5),
      });
    }
  }

  return <EquipmentCommandCenter modules={modules.length ? modules : FALLBACK_MODULES} />;
}
