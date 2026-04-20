import { type Equipment, type Ingredient, type Stabilizer } from "@/lib/default-data";

type LibraryModalProps = {
  open: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  stabilizers: Stabilizer[];
  selectedEquipment: Equipment;
  formatMetric: (value: number, suffix?: string) => string;
};

export function LibraryModal({
  open,
  onClose,
  ingredients,
  stabilizers,
  selectedEquipment,
  formatMetric,
}: LibraryModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4 backdrop-blur-md">
      <div className="luxury-card max-h-[88vh] w-full max-w-5xl overflow-auto rounded-[30px] p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">Ingredient Library</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Defaults and machine settings coming from the isolated gelato schema.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm transition hover:border-[rgba(212,175,55,0.3)]"
          >
            Close
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-[24px] border border-[var(--accent-border)]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[rgba(212,175,55,0.08)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Ingredient</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">PAC</th>
                  <th className="px-4 py-3 font-medium">POD</th>
                  <th className="px-4 py-3 font-medium">Cost / Kg</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ingredient) => (
                  <tr key={ingredient.id} className="border-t border-[var(--accent-border)]">
                    <td className="px-4 py-3">{ingredient.name}</td>
                    <td className="px-4 py-3">{ingredient.category}</td>
                    <td className="px-4 py-3">{formatMetric(ingredient.pac_value)}</td>
                    <td className="px-4 py-3">{formatMetric(ingredient.pod_value)}</td>
                    <td className="px-4 py-3">${formatMetric(ingredient.cost_per_kg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            {stabilizers.map((item) => {
              const disabled = item.process_type === "Hot" && !selectedEquipment.heating_capability;
              const disabledMessage =
                "Selected equipment does not support pasteurization; please use Cold Process stabilizers.";

              return (
                <div
                  key={item.id}
                  title={disabled ? disabledMessage : undefined}
                  className={`rounded-[24px] border p-4 ${
                    disabled
                      ? "border-[rgba(255,140,111,0.18)] bg-[rgba(255,140,111,0.05)] opacity-60"
                      : "border-[var(--accent-border)] bg-black/10"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    {item.process_type}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{item.brand_name}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{item.product_name}</p>
                  <p className="mt-3 text-sm text-[var(--foreground)]/85">
                    {disabled
                      ? disabledMessage
                      : `Suggested dosage ${formatMetric(item.dosage_range_min, "%")} to ${formatMetric(item.dosage_range_max, "%")}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
