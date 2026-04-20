type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
};

type InvoiceRowProps = {
  label: string;
  value: string;
  emphasized?: boolean;
};

type ToggleChipProps = {
  selected: boolean;
  label: string;
  onClick: () => void;
};

type SliderRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  suffix: string;
  formatMetric: (value: number, suffix?: string) => string;
  highlighted?: boolean;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-muted)]">{label}</p>
      <p className="metric-value mt-3 text-2xl font-semibold">{value}</p>
      {detail ? <p className="mt-2 text-xs text-[var(--text-muted)]">{detail}</p> : null}
    </div>
  );
}

export function InvoiceRow({ label, value, emphasized = false }: InvoiceRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-[var(--accent-border)] py-3 ${
        emphasized ? "text-[var(--foreground)]" : "text-[var(--foreground)]/86"
      }`}
    >
      <span className="text-sm uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</span>
      <span className={`text-sm ${emphasized ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

export function ToggleChip({ selected, label, onClick }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        selected
          ? "border-[rgba(212,175,55,0.34)] bg-[rgba(212,175,55,0.12)] text-[var(--foreground)]"
          : "border-[var(--accent-border)] bg-black/10 text-[var(--text-muted)]"
      }`}
    >
      {label}
    </button>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
  formatMetric,
  highlighted = false,
}: SliderRowProps) {
  return (
    <label
      className={`block rounded-[24px] border bg-black/10 p-4 transition ${
        highlighted
          ? "border-[rgba(212,175,55,0.42)] shadow-[0_0_0_1px_rgba(212,175,55,0.2)] animate-pulse"
          : "border-[var(--accent-border)]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">{label}</span>
        <span className="text-sm font-medium">{formatMetric(value, suffix)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  );
}
