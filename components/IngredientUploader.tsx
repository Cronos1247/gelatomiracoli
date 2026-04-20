"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { processIngredientPDF, type ParsedIngredientPdf } from "@/lib/process-ingredient-pdf";

type IngredientUploaderProps = {
  onParsed: (file: File, parsed: ParsedIngredientPdf) => void;
  onReviewRequested?: () => void;
};

export function IngredientUploader({ onParsed, onReviewRequested }: IngredientUploaderProps) {
  const [scanState, setScanState] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [parsedName, setParsedName] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];

      if (!file) {
        return;
      }

      setScanState("scanning");
      setScanProgress(8);
      setScanError(null);
      setParsedName(null);

      const intervalId = window.setInterval(() => {
        setScanProgress((current) => Math.min(current + Math.random() * 12, 88));
      }, 130);

      try {
        const parsed = await processIngredientPDF(file);

        window.clearInterval(intervalId);
        setScanProgress(100);
        setParsedName(parsed.extracted.name);
        setScanState("success");
        onParsed(file, parsed);
      } catch (error) {
        window.clearInterval(intervalId);
        setScanState("error");
        setScanError(error instanceof Error ? error.message : "Unable to scan that PDF.");
      }
    },
    [onParsed]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    onDrop,
  });

  return (
    <div
      {...getRootProps()}
      className={`cursor-pointer rounded-[30px] border border-dashed p-8 text-center transition ${
        isDragActive
          ? "border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.08)]"
          : "border-[rgba(212,175,55,0.18)] bg-black/10"
      }`}
    >
      <input {...getInputProps()} />
      <p className="text-sm uppercase tracking-[0.28em] text-[var(--text-muted)]">Drop PDF Here</p>
      <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">
        {scanState === "scanning"
          ? "Scanning..."
          : isDragActive
            ? "Release to scan"
            : "Drag and drop a PreGel tech sheet"}
      </h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
        Accepts PDF files only. The scan extracts balancing parameters, nutrition fallback values,
        and dosage guidance for review before saving.
      </p>

      {scanState === "scanning" ? (
        <div className="mx-auto mt-6 max-w-2xl">
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#c79a1f,#f5d37a)] transition-[width] duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-[var(--accent)]">Reading technical sheet...</p>
        </div>
      ) : null}

      {scanState === "success" && parsedName ? (
        <div className="mx-auto mt-6 max-w-2xl rounded-[24px] border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.06)] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Success</p>
          <p className="mt-3 text-2xl font-semibold text-[var(--accent)]">{parsedName}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onReviewRequested?.();
              }}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b1612]"
            >
              Review
            </button>
          </div>
        </div>
      ) : null}

      {scanState === "error" && scanError ? (
        <div className="mx-auto mt-6 max-w-2xl rounded-[24px] border border-[rgba(255,140,111,0.28)] bg-[rgba(255,140,111,0.08)] p-5 text-sm text-[var(--danger)]">
          {scanError}
        </div>
      ) : null}
    </div>
  );
}
