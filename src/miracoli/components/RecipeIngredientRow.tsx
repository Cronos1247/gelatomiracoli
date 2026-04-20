"use client";

type RecipeIngredientRowProps = {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  dosageGuidelinePerKg?: number | null;
  alerted?: boolean;
  highlighted?: boolean;
  onChange: (value: number) => void;
};

export function RecipeIngredientRow({
  name,
  value,
  min,
  max,
  step,
  suffix = "",
  dosageGuidelinePerKg,
  alerted = false,
  highlighted = false,
  onChange,
}: RecipeIngredientRowProps) {
  return (
    <div
      className={`miracoli-ingredient-row rounded-[26px] p-4 sm:p-5 ${
        alerted ? "miracoli-danger-pulse" : highlighted ? "animate-pulse ring-1 ring-[rgba(212,175,55,0.34)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="miracoli-serif text-xl tracking-[-0.03em] text-[var(--foreground)]">
            {name}
          </p>
          {dosageGuidelinePerKg ? (
            <p className="mt-2 text-sm italic text-[rgba(245,245,220,0.6)]">
              Recommended: {dosageGuidelinePerKg.toFixed(0)}g per kg of base
            </p>
          ) : null}
        </div>
        <span className="metric-value text-lg font-semibold">
          {value.toFixed(0)}
          {suffix}
        </span>
      </div>

      <div className="mt-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="miracoli-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-[rgba(255,255,255,0.08)]"
        />
      </div>
    </div>
  );
}
