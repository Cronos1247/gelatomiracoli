"use client";

import { useMemo, useState } from "react";
import { Cpu, Plus } from "lucide-react";

export type EquipmentModule = {
  id: string;
  title: string;
  subtitle: string;
  type: "display" | "production";
  temperatureC?: number;
  minBatchL?: number;
  maxBatchL?: number;
};

function DisplayModuleCard({ module }: { module: EquipmentModule }) {
  const [temperature, setTemperature] = useState(module.temperatureC ?? -15);

  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 backdrop-blur-xl">
      <div className="absolute right-6 top-6 h-3 w-3 rounded-full bg-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.8)] animate-pulse" />
      <p className="text-2xl font-semibold text-white">{module.title}</p>
      <p className="mt-2 text-sm text-white/45">{module.subtitle}</p>

      <div className="mt-8 space-y-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">
          Target Operating Temp
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTemperature((current) => Number((current - 0.5).toFixed(1)))}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-2xl text-white transition hover:scale-105 hover:bg-white/[0.08] active:scale-95"
          >
            -
          </button>
          <div className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-black/50 px-6 py-4">
            <span className="font-mono text-4xl text-[#00E5FF]">{temperature.toFixed(1)}</span>
            <span className="text-lg text-white/35">°C</span>
          </div>
          <button
            type="button"
            onClick={() => setTemperature((current) => Number((current + 0.5).toFixed(1)))}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-2xl text-white transition hover:scale-105 hover:bg-white/[0.08] active:scale-95"
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductionModuleCard({ module }: { module: EquipmentModule }) {
  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 backdrop-blur-xl">
      <div className="absolute right-6 top-6 h-3 w-3 rounded-full bg-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.8)] animate-pulse" />
      <p className="text-2xl font-semibold text-white">{module.title}</p>
      <p className="mt-2 text-sm text-white/45">{module.subtitle}</p>

      <div className="mt-8 space-y-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">
          Production Capacity
        </p>
        <div className="rounded-xl border border-white/5 bg-black/50 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/35">Min</p>
              <p className="mt-2 font-mono text-3xl text-[#00E5FF]">
                {(module.minBatchL ?? 0).toFixed(1)} <span className="text-base text-white/35">L</span>
              </p>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/35">Max</p>
              <p className="mt-2 font-mono text-3xl text-[#00E5FF]">
                {(module.maxBatchL ?? 0).toFixed(1)} <span className="text-base text-white/35">L</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function GhostModuleCard() {
  return (
    <div className="flex cursor-pointer items-center justify-center rounded-[2rem] border-2 border-dashed border-white/20 p-8 transition-all hover:border-cyan-500/50 hover:bg-cyan-900/10">
      <div className="flex flex-col items-center gap-3 text-white/62">
        <Plus size={28} />
        <span className="text-sm uppercase tracking-[0.2em]">Deploy New Hardware</span>
      </div>
    </div>
  );
}

export function EquipmentCommandCenter({ modules }: { modules: EquipmentModule[] }) {
  const displayModules = useMemo(
    () => modules.filter((module) => module.type === "display"),
    [modules]
  );
  const productionModules = useMemo(
    () => modules.filter((module) => module.type === "production"),
    [modules]
  );

  return (
    <main className="px-4 pb-8 pt-2 sm:px-6 lg:px-8">
      <section className="space-y-8">
        <div className="space-y-4 text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/42">
            Configuration Dashboard
          </p>
          <h1
            className="text-5xl tracking-[0.08em] text-white"
            style={{ fontFamily: "var(--font-miracoli-serif)" }}
          >
            HARDWARE MATRIX
          </h1>
        </div>

        <div className="space-y-10">
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <Cpu size={18} className="text-cyan-200/80" />
              <h2 className="text-lg uppercase tracking-[0.24em] text-white/62">
                Front of House (Display)
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {displayModules.map((module) => (
                <DisplayModuleCard key={module.id} module={module} />
              ))}
              <GhostModuleCard />
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <Cpu size={18} className="text-cyan-200/80" />
              <h2 className="text-lg uppercase tracking-[0.24em] text-white/62">
                Back of House (Production)
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {productionModules.map((module) => (
                <ProductionModuleCard key={module.id} module={module} />
              ))}
              <GhostModuleCard />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
