import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MasterLedger, type MasterLedgerRow } from "@/components/portal/MasterLedger";

type RawLedgerRow = Record<string, unknown>;

function normalizeNumber(value: unknown) {
  const next = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function normalizeLedgerRow(record: RawLedgerRow): MasterLedgerRow {
  const isGlobal =
    record.is_global === true ||
    record.is_master === true ||
    record.user_id === null ||
    record.user_id === undefined;

  return {
    id: String(record.id),
    name: String(record.name ?? "Unnamed Ingredient"),
    category: String(record.category ?? "Other"),
    fat_pct: normalizeNumber(record.fat_pct),
    sugar_pct: normalizeNumber(record.sugar_pct),
    total_solids_pct: normalizeNumber(record.total_solids_pct),
    pac_value: normalizeNumber(record.pac_value),
    pod_value: normalizeNumber(record.pod_value),
    cost_per_container: normalizeNumber(record.cost_per_container),
    container_size_g: normalizeNumber(record.container_size_g || 1000),
    user_id: typeof record.user_id === "string" ? record.user_id : null,
    is_global: isGlobal,
    is_verified: record.is_verified === true,
  };
}

function dedupeRows(rows: MasterLedgerRow[], currentUserId: string | null) {
  const deduped = new Map<string, MasterLedgerRow>();

  for (const row of rows) {
    const key = (row.name || "").trim().toLowerCase();
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, row);
      continue;
    }

    const existingOwned = existing.user_id === currentUserId;
    const nextOwned = row.user_id === currentUserId;

    if (!existingOwned && nextOwned) {
      deduped.set(key, row);
    }
  }

  return [...deduped.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export const dynamic = "force-dynamic";

export default async function PortalPantryPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return <MasterLedger initialRows={[]} currentUserId={null} />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let supportsIsGlobal = true;
  const globalProbe = await supabase.from("ingredients").select("id, is_global").limit(1);
  if (globalProbe.error) {
    supportsIsGlobal = false;
  }

  let query = supabase.from("ingredients").select("*").order("name", { ascending: true });

  if (supportsIsGlobal) {
    query = user
      ? query.or(`user_id.eq.${user.id},is_global.eq.true`)
      : query.eq("is_global", true);
  } else {
    query = user
      ? query.or(`user_id.eq.${user.id},is_master.eq.true,user_id.is.null`)
      : query.or("is_master.eq.true,user_id.is.null");
  }

  const { data, error } = await query;

  const normalizedRows = !error && data
    ? dedupeRows(
        (data as RawLedgerRow[]).map((row) => normalizeLedgerRow(row)),
        user?.id ?? null
      )
    : [];

  return (
    <MasterLedger initialRows={normalizedRows} currentUserId={user?.id ?? null} />
  );
}
