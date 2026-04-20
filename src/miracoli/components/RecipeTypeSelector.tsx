"use client";

import { ARCHETYPES, type ArchetypeKey } from "@/lib/balance-gelato";

type RecipeTypeSelectorProps = {
  selected: ArchetypeKey;
  onSelect: (value: ArchetypeKey) => void;
};

const cardArt: Record<
  ArchetypeKey,
  {
    eyebrow: string;
    accentClass: string;
    emblem: string;
  }
> = {
  "milk-based-standard": {
    eyebrow: "Classic Crema",
    accentClass: "from-[rgba(245,245,220,0.26)] via-[rgba(212,175,55,0.18)] to-transparent",
    emblem: "MILK",
  },
  "high-fat-chocolate-nut": {
    eyebrow: "Rich Chocolate/Nut",
    accentClass: "from-[rgba(212,175,55,0.32)] via-[rgba(133,94,66,0.2)] to-transparent",
    emblem: "CACAO",
  },
  "fruit-sorbet": {
    eyebrow: "Fresh Fruit Sorbet",
    accentClass: "from-[rgba(232,188,118,0.24)] via-[rgba(164,84,59,0.18)] to-transparent",
    emblem: "FRUIT",
  },
  "low-sugar-modern": {
    eyebrow: "Custom Lab",
    accentClass: "from-[rgba(130,160,138,0.22)] via-[rgba(212,175,55,0.14)] to-transparent",
    emblem: "LAB",
  },
};

export function RecipeTypeSelector({ selected, onSelect }: RecipeTypeSelectorProps) {
  return (
    <div className="mb-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
            Archetype Selector
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em]">
            Choose the goal post before the math starts
          </h3>
        </div>
        <p className="max-w-md text-right text-sm text-[var(--text-muted)]">
          Each archetype preloads the target fat, sugar, solids, PAC, and POD curve for the
          recipe.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(ARCHETYPES).map(([key, archetype]) => {
          const cardKey = key as ArchetypeKey;
          const art = cardArt[cardKey];
          const selectedCard = selected === cardKey;

          return (
            <button
              key={cardKey}
              type="button"
              onClick={() => onSelect(cardKey)}
              className={`group relative overflow-hidden rounded-[26px] border p-5 text-left transition ${
                selectedCard
                  ? "border-[rgba(212,175,55,0.44)] bg-[rgba(212,175,55,0.12)] shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
                  : "border-[var(--accent-border)] bg-[rgba(44,38,33,0.74)] hover:border-[rgba(212,175,55,0.3)] hover:bg-[rgba(58,49,42,0.84)]"
              }`}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${art.accentClass} opacity-90`}
              />
              <div className="relative flex items-start justify-between gap-4">
                <div className="max-w-[78%]">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    {art.eyebrow}
                  </p>
                  <h4 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    {archetype.label}
                  </h4>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                    {archetype.description}
                  </p>
                </div>
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-[rgba(212,175,55,0.28)] bg-[rgba(18,14,12,0.4)] text-[11px] uppercase tracking-[0.28em] text-[var(--accent)] backdrop-blur-md">
                  <div className="absolute inset-3 rounded-[18px] border border-[rgba(245,245,220,0.18)]" />
                  <div className="absolute inset-x-5 top-5 h-5 rounded-full border border-[rgba(212,175,55,0.28)]" />
                  <div className="absolute inset-x-6 bottom-5 h-3 rounded-full bg-[rgba(212,175,55,0.14)]" />
                  <span className="relative">{art.emblem}</span>
                </div>
              </div>

              <div className="relative mt-5 grid grid-cols-2 gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                <span className="rounded-full border border-[rgba(212,175,55,0.16)] px-3 py-2">
                  Fat {archetype.targetFatPct}%
                </span>
                <span className="rounded-full border border-[rgba(212,175,55,0.16)] px-3 py-2">
                  Sugar {archetype.targetSugarPct}%
                </span>
                <span className="rounded-full border border-[rgba(212,175,55,0.16)] px-3 py-2">
                  Solids {archetype.targetSolidsPct}%
                </span>
                <span className="rounded-full border border-[rgba(212,175,55,0.16)] px-3 py-2">
                  PAC / POD {archetype.targetPac} / {archetype.targetPodPct}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
