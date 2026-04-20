"use client";

import { motion } from "framer-motion";

type MetricKind = "pac" | "pod";

type TelemetryHUDProps = {
  totalPac: number;
  totalPod: number;
};

const MAX_VALUE = 400;
const TARGET_ZONE = { min: 240, max: 320 };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMetricState(value: number) {
  if (value > TARGET_ZONE.max) {
    return {
      barClass:
        "bg-[#FF073A] shadow-[0_0_10px_rgba(255,7,58,0.8)]",
      textClass: "text-[#FF073A]",
    };
  }

  if (value >= TARGET_ZONE.min && value <= TARGET_ZONE.max) {
    return {
      barClass:
        "bg-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.8)]",
      textClass: "text-[#00E676]",
    };
  }

  return {
    barClass: "bg-yellow-500/80",
    textClass: "text-yellow-300",
  };
}

function TelemetryTrack({
  label,
  value,
}: {
  label: string;
  value: number;
  kind: MetricKind;
}) {
  const widthPct = `${clamp((value / MAX_VALUE) * 100, 0, 100)}%`;
  const targetLeft = `${(TARGET_ZONE.min / MAX_VALUE) * 100}%`;
  const targetWidth = `${((TARGET_ZONE.max - TARGET_ZONE.min) / MAX_VALUE) * 100}%`;
  const state = getMetricState(value);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <span className="text-[11px] uppercase tracking-[0.24em] text-white/48">
          {label}
        </span>
        <span
          className={`font-mono text-2xl font-bold tracking-[0.22em] ${state.textClass}`}
        >
          {Math.round(value)}
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-white/5">
        <div
          className="absolute inset-y-0 rounded-full bg-white/10"
          style={{ left: targetLeft, width: targetWidth }}
        />
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${state.barClass}`}
          animate={{ width: widthPct }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
        />
      </div>
    </div>
  );
}

export function TelemetryHUD({ totalPac, totalPod }: TelemetryHUDProps) {
  return (
    <div className="rounded-[1.6rem] border-b border-white/10 bg-black/40 p-6 backdrop-blur-2xl">
      <div className="flex flex-col gap-5">
        <TelemetryTrack label="TOTAL PAC" value={totalPac} kind="pac" />
        <TelemetryTrack label="TOTAL POD" value={totalPod} kind="pod" />
      </div>
    </div>
  );
}
