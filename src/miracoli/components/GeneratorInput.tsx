"use client";

type GeneratorInputProps = {
  value: string;
  suggestion: string | null;
  busy?: boolean;
  onChange: (value: string) => void;
  onGenerate: () => void;
};

export function GeneratorInput({
  value,
  suggestion,
  busy = false,
  onChange,
  onGenerate,
}: GeneratorInputProps) {
  return (
    <div className="rounded-[26px] border border-[rgba(212,175,55,0.18)] bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(212,175,55,0.05))] p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
        Maestro
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onGenerate();
            }
          }}
          placeholder="What are we creating today?"
          className="min-w-[240px] flex-1 rounded-full border border-[var(--accent-border)] bg-black/10 px-5 py-3 text-base outline-none transition focus:border-[rgba(212,175,55,0.34)]"
        />
        <button
          type="button"
          onClick={onGenerate}
          className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b1612]"
        >
          {busy ? "Generating..." : "Generate"}
        </button>
      </div>
      <div className="mt-3 min-h-6 text-sm italic text-[rgba(245,245,220,0.65)] transition">
        {suggestion ? suggestion : "Type a flavor and Miracoli will suggest the closest verified pantry route."}
      </div>
    </div>
  );
}
