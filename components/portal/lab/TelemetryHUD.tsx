"use client";

type TelemetryHUDProps = {
  totalPac: number;
  totalPod: number;
  totalSolids: number;
};

function TelemetryMetric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3">
      <span className="text-[11px] uppercase tracking-[0.24em] text-white/48">{label}</span>
      <span className="font-mono text-4xl font-bold tracking-tight text-[#FF073A] drop-shadow-[0_0_15px_rgba(255,7,58,0.5)]">
        {value.toFixed(suffix ? 1 : 0)}
        {suffix ?? ""}
      </span>
    </div>
  );
}

export function TelemetryHUD({ totalPac, totalPod, totalSolids }: TelemetryHUDProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
        <TelemetryMetric label="PAC" value={totalPac} />
        <TelemetryMetric label="POD" value={totalPod} />
        <TelemetryMetric label="SOLIDS" value={totalSolids} suffix="%" />
      </div>
    </div>
  );
}
