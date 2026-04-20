"use client";

import {
  extractBalancingParametersTable,
  processIngredientPDF,
  type ParsedIngredientPdf,
} from "@/lib/process-ingredient-pdf";
import {
  loadDuplicateProductCodes,
  validateParsedIngredient,
  type ParsedIngredientValidation,
} from "./validateParsedIngredient";

export type BatchIngestionStatus =
  | "pending"
  | "processing"
  | "verified"
  | "warning"
  | "needs-review"
  | "committing"
  | "committed"
  | "error";

export type BatchIngestionItem = {
  id: string;
  file: File;
  fileName: string;
  status: BatchIngestionStatus;
  validation: ParsedIngredientValidation | null;
  confidenceScore: number;
  balancingSnippet: string | null;
  isVerified: boolean;
  verificationReason: string | null;
  parsed: ParsedIngredientPdf | null;
  errorMessage: string | null;
};

async function runWithConcurrency<T>(
  entries: readonly T[],
  concurrency: number,
  handler: (entry: T, index: number) => Promise<void>
) {
  let cursor = 0;

  const workers = Array.from({ length: Math.min(concurrency, entries.length) }, async () => {
    while (cursor < entries.length) {
      const currentIndex = cursor;
      cursor += 1;
      await handler(entries[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
}

export async function processBatchUpload(
  files: File[],
  options?: {
    onProgress?: (progress: { completed: number; total: number }) => void;
  }
): Promise<BatchIngestionItem[]> {
  const acceptedFiles = files.filter((file) => file.type === "application/pdf");
  const parsedResults = new Array<{
    file: File;
    parsed: ParsedIngredientPdf | null;
    errorMessage: string | null;
  }>(acceptedFiles.length);
  let completed = 0;

  await runWithConcurrency(acceptedFiles, 5, async (file, index) => {
    try {
      const parsed = await processIngredientPDF(file);
      parsedResults[index] = {
        file,
        parsed,
        errorMessage: null,
      };
    } catch (error) {
      parsedResults[index] = {
        file,
        parsed: null,
        errorMessage:
          error instanceof Error ? error.message : "Unable to scan this technical sheet.",
      };
    } finally {
      completed += 1;
      options?.onProgress?.({
        completed,
        total: acceptedFiles.length,
      });
    }
  });

  const duplicateProductCodes = await loadDuplicateProductCodes(
    parsedResults
      .map((result) => result?.parsed?.extracted.product_code ?? "")
      .filter(Boolean)
  );

  return Promise.all(
    parsedResults.map(async (result, index) => {
      if (result?.parsed) {
        const validation = await validateParsedIngredient(result.parsed.extracted, {
          duplicateProductCodes,
          parsed: result.parsed,
        });

        return {
          id: crypto.randomUUID(),
          file: result.file,
          fileName: result.file.name,
          status:
            validation.status === "verified"
              ? "verified"
              : validation.status === "warning"
                ? "warning"
                : "error",
          validation,
          confidenceScore: result.parsed.confidenceScore,
          balancingSnippet: extractBalancingParametersTable(result.parsed.rawText),
          isVerified: validation.status === "verified",
          verificationReason: validation.reason,
          parsed: result.parsed,
          errorMessage: null,
        } satisfies BatchIngestionItem;
      }

      return {
        id: crypto.randomUUID(),
        file: acceptedFiles[index],
        fileName: acceptedFiles[index]?.name ?? `file-${index + 1}.pdf`,
        status: "error",
        validation: {
          status: "error",
          label: "Parse Failed",
          reason: result?.errorMessage ?? "Unable to scan this technical sheet.",
          isDuplicate: false,
        },
        confidenceScore: 0,
        balancingSnippet: null,
        isVerified: false,
        verificationReason: null,
        parsed: null,
        errorMessage: result?.errorMessage ?? "Unable to scan this technical sheet.",
      } satisfies BatchIngestionItem;
    })
  );
}
