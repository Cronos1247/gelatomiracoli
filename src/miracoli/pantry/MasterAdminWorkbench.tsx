"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SpecialZoomLevel, Viewer, Worker } from "@react-pdf-viewer/core";
import { searchPlugin } from "@react-pdf-viewer/search";
import { usePantry } from "@/hooks/usePantry";
import type { Ingredient } from "@/lib/default-data";
import {
  readProfileSettings,
  SESSION_KEYS,
  type ProfileSettings,
} from "@/lib/storage";
import {
  derivePacPod,
  processIngredientPDF,
  type ParsedIngredientPdf,
} from "@/lib/process-ingredient-pdf";
import { BatchPantryUpload, type BatchQueueListItem } from "./BatchUploadQueue";

const PDF_WORKER_URL = "https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js";
const STATIC_BRANDS = ["PreGel", "Mec3", "Comprital", "Martini", "Fabbri", "Babbi"];
const AUTO_COMMIT_CONFIDENCE = 80;

type WorkbenchQueueItem = {
  id: string;
  file: File;
  fileUrl: string | null;
  parsed: ParsedIngredientPdf | null;
  draft: ParsedIngredientPdf["extracted"] | null;
  status: BatchQueueListItem["status"];
  confidenceScore: number;
  needsManualReview: boolean;
  errorMessage: string | null;
};

type MasterAdminWorkbenchProps = {
  initialIngredients: Ingredient[];
};

type FormFieldProps = {
  label: string;
  value: string | number;
  type?: "text" | "number";
  step?: string;
  onChange: (value: string) => void;
};

function FormField({ label, value, type = "text", step, onChange }: FormFieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {label}
      </span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[18px] border border-[rgba(212,175,55,0.24)] bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-[rgba(212,175,55,0.42)]"
      />
    </label>
  );
}

function hasQuickCommitData(item: WorkbenchQueueItem) {
  const draft = item.draft;

  if (!draft) {
    return false;
  }

  return (
    draft.fat_pct > 0 &&
    draft.total_solids_pct > 0 &&
    draft.sugar_pct >= 0 &&
    draft.pac_value > 0 &&
    draft.pod_value > 0
  );
}

function canAutoCommit(item: WorkbenchQueueItem) {
  return Boolean(item.draft && item.parsed && item.confidenceScore >= AUTO_COMMIT_CONFIDENCE);
}

function canManualCommit(item: WorkbenchQueueItem) {
  return Boolean(item.draft && (item.confidenceScore >= AUTO_COMMIT_CONFIDENCE || hasQuickCommitData(item)));
}

function normalizeErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message || error.name;
  }

  if (error && typeof error === "object") {
    if ("message" in error) {
      return normalizeErrorMessage(error.message);
    }

    if ("error" in error) {
      return normalizeErrorMessage(error.error);
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error ?? "Unknown error");
}

export function MasterAdminWorkbench({ initialIngredients }: MasterAdminWorkbenchProps) {
  const { masterIngredients, refresh } = usePantry({
    initialIngredients,
  });
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [queue, setQueue] = useState<WorkbenchQueueItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [processingTotal, setProcessingTotal] = useState(0);
  const [processingCompleted, setProcessingCompleted] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const fileUrlsRef = useRef<string[]>([]);
  const lastHighlightedItemIdRef = useRef<string | null>(null);
  const autoCommitInFlightRef = useRef<Set<string>>(new Set());
  const search = searchPlugin({
    onHighlightKeyword: ({ highlightEle }) => {
      highlightEle.style.background = "rgba(212, 175, 55, 0.24)";
      highlightEle.style.outline = "1px solid rgba(212, 175, 55, 0.4)";
      highlightEle.style.borderRadius = "4px";
    },
  });

  useEffect(() => {
    setProfile(readProfileSettings());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedDraft = window.sessionStorage.getItem(SESSION_KEYS.workbenchDraft);

    if (!storedDraft) {
      return;
    }

    try {
      const parsedStored = JSON.parse(storedDraft) as {
        fileName: string;
        fileType: string;
        fileBase64: string;
        parsed: ParsedIngredientPdf;
      };
      const binary = window.atob(parsedStored.fileBase64);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const file = new File([bytes], parsedStored.fileName, {
        type: parsedStored.fileType || "application/pdf",
      });
      const fileUrl = URL.createObjectURL(file);
      fileUrlsRef.current.push(fileUrl);

      const nextItem: WorkbenchQueueItem = {
        id: crypto.randomUUID(),
        file,
        fileUrl,
        parsed: parsedStored.parsed,
        draft: parsedStored.parsed.extracted,
        status: "pending-review",
        confidenceScore: parsedStored.parsed.confidenceScore,
        needsManualReview: true,
        errorMessage: null,
      };

      setQueue((current) => {
        const withoutSameFile = current.filter((item) => item.file.name !== nextItem.file.name);
        return [nextItem, ...withoutSameFile];
      });
      setActiveItemId(nextItem.id);
      setSaveError(null);
      setSaveSuccess(
        `${parsedStored.parsed.extracted.name || parsedStored.fileName} loaded into manual override.`
      );
    } catch {
      setSaveError("Unable to restore the selected ingestion row into the workbench.");
    } finally {
      window.sessionStorage.removeItem(SESSION_KEYS.workbenchDraft);
    }
  }, []);

  const activeItem = useMemo(
    () => queue.find((item) => item.id === activeItemId) ?? null,
    [activeItemId, queue]
  );

  const reviewCards = useMemo(
    () => queue.filter((item) => item.parsed && item.status !== "processing"),
    [queue]
  );

  const brandOptions = useMemo(() => {
    const dynamicBrands = masterIngredients
      .map((ingredient) => ingredient.brand_name)
      .filter((brand): brand is string => Boolean(brand));
    const activeBrand = activeItem?.draft?.brand_name ? [activeItem.draft.brand_name] : [];

    return Array.from(new Set([...STATIC_BRANDS, ...dynamicBrands, ...activeBrand])).sort();
  }, [activeItem?.draft?.brand_name, masterIngredients]);

  const queueListItems = useMemo<BatchQueueListItem[]>(
    () =>
      queue.map((item) => ({
        id: item.id,
        fileName: item.file.name,
        extractedName: item.draft?.name ?? item.parsed?.extracted.name ?? "",
        status: item.status,
        extractionSource: item.draft?.extraction_source ?? "Awaiting parse",
        confidenceScore: item.confidenceScore,
        needsManualReview: item.needsManualReview,
        errorMessage: item.errorMessage,
      })),
    [queue]
  );

  useEffect(() => {
    if (!activeItem?.fileUrl || !activeItem.draft) {
      return;
    }

    if (lastHighlightedItemIdRef.current === activeItem.id) {
      return;
    }

    lastHighlightedItemIdRef.current = activeItem.id;
    void search.highlight([
      "BALANCING PARAMETERS",
      "NUTRITION LABELLING",
      "NUTRITION LABELING",
      "NUTRITION FACTS",
    ]);
  }, [activeItem?.id, activeItem?.fileUrl, activeItem?.draft, search]);

  useEffect(() => {
    return () => {
      fileUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const eligibleItems = queue.filter(
      (item) =>
        item.status === "pending-review" &&
        canAutoCommit(item) &&
        !autoCommitInFlightRef.current.has(item.id)
    );

    if (!eligibleItems.length) {
      return;
    }

    eligibleItems.forEach((item) => autoCommitInFlightRef.current.add(item.id));

    void commitQueueItems(
      eligibleItems.map((item) => ({
        id: item.id,
        file: item.file,
        draft: item.draft!,
        parsed: item.parsed,
      })),
      {
        mode: "auto",
        clearMessages: false,
      }
    ).finally(() => {
      eligibleItems.forEach((item) => autoCommitInFlightRef.current.delete(item.id));
    });
  }, [queue]);

  const publishParsedSheet = async (target: {
    file: File;
    draft: ParsedIngredientPdf["extracted"];
    parsed: ParsedIngredientPdf | null;
  }) => {
    const formData = new FormData();

    formData.append("pdf", target.file);
    formData.append(
      "payload",
      JSON.stringify({
        ...target.draft,
        raw_ocr_dump: target.parsed?.rawText ?? "",
        publish_to_master: true,
      })
    );

    const response = await fetch("/api/pantry/ingredient-pdf", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as {
      error?: string;
      item?: Record<string, unknown>;
    };

    if (!response.ok || data.error || !data.item) {
      throw new Error(
        normalizeErrorMessage(data.error ?? `Unable to publish ingredient to the master vault (${response.status}).`)
      );
    }

    return data.item;
  };

  const commitQueueItems = async (
    targets: Array<Pick<WorkbenchQueueItem, "id" | "file" | "draft" | "parsed">>,
    options?: {
      mode?: "auto" | "manual";
      clearMessages?: boolean;
    }
  ) => {
    const commitTargets = targets.filter(
      (
        target
      ): target is {
        id: string;
        file: File;
        draft: ParsedIngredientPdf["extracted"];
        parsed: ParsedIngredientPdf | null;
      } => Boolean(target.draft)
    );

    if (!commitTargets.length) {
      return { publishedCount: 0, failedCount: 0 };
    }

    const targetIds = new Set(commitTargets.map((target) => target.id));

    if (options?.clearMessages !== false) {
      setSaveError(null);
      setSaveSuccess(null);
    }

    setQueue((current) =>
      current.map((item) =>
        targetIds.has(item.id) ? { ...item, status: "publishing", errorMessage: null } : item
      )
    );

    const publishResults = await Promise.allSettled(
      commitTargets.map(async (target) => ({
        id: target.id,
        item: await publishParsedSheet(target),
      }))
    );

    const failedIds = new Map<string, string>();
    const publishedNamesById = new Map<string, string>();
    let publishedCount = 0;

    publishResults.forEach((result, index) => {
      const targetId = commitTargets[index]?.id;

      if (!targetId) {
        return;
      }

      if (result.status === "fulfilled") {
        publishedCount += 1;
        publishedNamesById.set(
          targetId,
          String(result.value.item.name ?? commitTargets[index]?.draft.name ?? "Scanned Ingredient")
        );
        return;
      }

      failedIds.set(
        targetId,
        normalizeErrorMessage(result.reason)
      );
    });

    setQueue((current) =>
      current.map((item) => {
        if (!targetIds.has(item.id)) {
          return item;
        }

        if (failedIds.has(item.id)) {
          return {
            ...item,
            status: "error",
            errorMessage: failedIds.get(item.id) ?? null,
          };
        }

        return {
          ...item,
          status: "published",
          needsManualReview: false,
          errorMessage: null,
          draft: item.draft
            ? {
                ...item.draft,
                name: publishedNamesById.get(item.id) ?? item.draft.name,
              }
            : item.draft,
        };
      })
    );

    if (publishedCount > 0) {
      setSaveSuccess(
        options?.mode === "auto"
          ? `${publishedCount} sheets auto-committed to Master Vault at ${AUTO_COMMIT_CONFIDENCE}%+ confidence.`
          : publishedCount === 1
            ? `${publishedNamesById.values().next().value ?? "Ingredient"} published to Master Vault.`
            : `${publishedCount} ingredients published to Master Vault.`
      );
      await refresh();
    }

    if (failedIds.size > 0) {
      setSaveError(
        failedIds.size === 1
          ? Array.from(failedIds.values())[0] ?? "Unable to publish ingredient to master."
          : "Some ingredients could not be committed. Open them in the workbench to review."
      );
    }

    return { publishedCount, failedCount: failedIds.size };
  };

  const handleFilesAdded = async (files: File[]) => {
    const acceptedFiles = files.slice(0, 50);
    const freshItems = acceptedFiles.map<WorkbenchQueueItem>((file) => ({
      id: crypto.randomUUID(),
      file,
      fileUrl: null,
      parsed: null,
      draft: null,
      status: "processing",
      confidenceScore: 0,
      needsManualReview: true,
      errorMessage: null,
    }));

    setSaveError(null);
    setSaveSuccess(null);
    setProcessingCompleted(0);
    setProcessingTotal(freshItems.length);
    setQueue((current) => [...freshItems, ...current]);
    setActiveItemId((current) => current ?? freshItems[0]?.id ?? null);

    const results = await Promise.allSettled(
      freshItems.map(async (pendingItem) => {
        try {
          const parsed = await processIngredientPDF(pendingItem.file);
          const fileUrl = URL.createObjectURL(pendingItem.file);
          fileUrlsRef.current.push(fileUrl);

          return {
            id: pendingItem.id,
            fileUrl,
            parsed,
            draft: parsed.extracted,
            status: "pending-review" as const,
            confidenceScore: parsed.confidenceScore,
            needsManualReview: parsed.needsManualReview,
            errorMessage: null,
          };
        } finally {
          setProcessingCompleted((current) => current + 1);
        }
      })
    );

    const completedById = new Map<
      string,
      Omit<WorkbenchQueueItem, "file" | "status" | "confidenceScore" | "needsManualReview"> & {
        status: WorkbenchQueueItem["status"];
        confidenceScore: number;
        needsManualReview: boolean;
      }
    >();

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        completedById.set(result.value.id, result.value);
        return;
      }

      completedById.set(freshItems[index].id, {
        id: freshItems[index].id,
        fileUrl: null,
        parsed: null,
        draft: null,
        status: "error",
        confidenceScore: 0,
        needsManualReview: true,
        errorMessage:
          normalizeErrorMessage(result.reason || "Unable to parse this technical sheet."),
      });
    });

    setQueue((current) =>
      current.map((item) => {
        const completed = completedById.get(item.id);

        if (!completed) {
          return item;
        }

        return {
          ...item,
          fileUrl: completed.fileUrl,
          parsed: completed.parsed,
          draft: completed.draft,
          status: completed.status,
          confidenceScore: completed.confidenceScore,
          needsManualReview: completed.needsManualReview,
          errorMessage: completed.errorMessage,
        };
      })
    );

    const autoPublishTargets = freshItems
      .map((freshItem) => {
        const completed = completedById.get(freshItem.id);

        if (!completed?.draft || !completed.parsed) {
          return null;
        }

        if (completed.confidenceScore < AUTO_COMMIT_CONFIDENCE) {
          return null;
        }

        return {
          id: freshItem.id,
          file: freshItem.file,
          draft: completed.draft,
          parsed: completed.parsed,
        };
      })
      .filter(
        (
          value
        ): value is {
          id: string;
          file: File;
          draft: ParsedIngredientPdf["extracted"];
          parsed: ParsedIngredientPdf;
        } => Boolean(value)
      );

    if (autoPublishTargets.length) {
      autoPublishTargets.forEach((target) => autoCommitInFlightRef.current.add(target.id));

      try {
        await commitQueueItems(autoPublishTargets, {
          mode: "auto",
          clearMessages: false,
        });
      } finally {
        autoPublishTargets.forEach((target) => autoCommitInFlightRef.current.delete(target.id));
      }
    }
  };

  const handleDraftPatch = (patch: Partial<ParsedIngredientPdf["extracted"]>) => {
    if (!activeItem?.draft) {
      return;
    }

    const draft = {
      ...activeItem.draft,
      ...patch,
    };

    if ("sugar_pct" in patch || "msnf_pct" in patch || "protein_g" in patch) {
      const normalizedProtein = Number(patch.msnf_pct ?? patch.protein_g ?? draft.msnf_pct);
      const recalculated = derivePacPod({
        sugarPct: Number(patch.sugar_pct ?? draft.sugar_pct),
        proteinG: normalizedProtein,
      });

      draft.protein_g = normalizedProtein;
      draft.msnf_pct = normalizedProtein;
      draft.pac_value = recalculated.pac_value;
      draft.pod_value = recalculated.pod_value;
    }

    const confidenceScore =
      (draft.fat_pct > 0 ? 30 : 0) +
      (draft.total_solids_pct > 0 ? 30 : 0) +
      (draft.sugar_pct >= 0 ? 20 : 0) +
      (draft.product_code ? 10 : 0) +
      (draft.revision_date ? 10 : 0);

    const needsManualReview = !(
      draft.fat_pct > 0 &&
      draft.total_solids_pct > 0 &&
      draft.sugar_pct >= 0 &&
      draft.pac_value > 0 &&
      draft.pod_value > 0
    );

    setQueue((current) =>
      current.map((item) =>
        item.id === activeItem.id
          ? {
              ...item,
              draft,
              confidenceScore,
              needsManualReview,
            }
          : item
      )
    );
  };

  const handlePublish = async (itemId = activeItem?.id) => {
    if (!itemId) {
      return;
    }

    const targetItem = queue.find((item) => item.id === itemId);

    if (!targetItem?.draft) {
      return;
    }

    setSaveError(null);
    setSaveSuccess(null);
    setActiveItemId(itemId);

    try {
      await commitQueueItems(
        [
          {
            id: targetItem.id,
            file: targetItem.file,
            draft: targetItem.draft,
            parsed: targetItem.parsed,
          },
        ],
        {
          mode: "manual",
          clearMessages: true,
        }
      );
    } catch (error) {
      const message = normalizeErrorMessage(error || "Unable to publish ingredient to master.");

      setSaveError(message);
      setQueue((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: "error",
                errorMessage: message,
              }
            : item
        )
      );
    }
  };

  const canCommit = Boolean(activeItem && canManualCommit(activeItem));

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <section className="luxury-card rounded-[32px] px-8 py-10 text-center">
          <p className="text-sm text-[var(--text-muted)]">Loading master admin profile...</p>
        </section>
      </main>
    );
  }

  if (!profile.isMasterAdmin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <section className="luxury-card max-w-2xl rounded-[32px] p-8 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">
            Protected Route
          </p>
          <h1 className="mt-3 font-serif text-4xl text-[var(--accent)]">Master Admin Workbench</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            This route is reserved for the Miracoli master pantry workflow. Enable Master Admin in
            your profile settings before opening the protected upload bench.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/pantry"
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b1612]"
            >
              Return to Pantry
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
      <section className="luxury-card rounded-[34px] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">
              Master Admin
            </p>
            <h1 className="mt-3 font-serif text-5xl tracking-[-0.05em] text-[var(--accent)]">
              Pantry Workbench
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">
              Queue first, verify second. Clean sheets can be committed in one click, while weaker
              parses route into the split-pane manual override bench.
            </p>
          </div>
          <Link
            href="/pantry"
            className="rounded-full border border-[var(--accent-border)] px-5 py-3 text-sm transition hover:border-[rgba(212,175,55,0.32)]"
          >
            Back to Pantry
          </Link>
        </div>
      </section>

      <BatchPantryUpload
        activeItemId={activeItemId}
        items={queueListItems}
        processingTotal={processingTotal}
        processingCompleted={processingCompleted}
        onFilesAdded={(files) => {
          void handleFilesAdded(files);
        }}
        onSelect={setActiveItemId}
      />

      <section className="luxury-card rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Review Mode
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
              Rapid-fire verification cards
            </h2>
          </div>
          <span className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm text-[var(--text-muted)]">
            {reviewCards.length} parsed items ready
          </span>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {reviewCards.length ? (
            reviewCards.map((item) => {
              const quickCommitReady = canManualCommit(item);
              const commitButtonLabel =
                item.status === "published"
                  ? "Committed"
                  : item.status === "publishing"
                    ? "Committing..."
                    : item.status === "error" && quickCommitReady
                      ? "Retry Commit"
                      : "Quick Commit";
              const statusMessage =
                item.status === "published"
                  ? "Committed to Master Vault."
                  : item.status === "publishing"
                    ? "Committing to Master Vault..."
                    : item.errorMessage
                      ? item.errorMessage
                      : item.confidenceScore >= AUTO_COMMIT_CONFIDENCE
                        ? `Eligible for auto-commit at ${AUTO_COMMIT_CONFIDENCE}%+ confidence.`
                        : item.needsManualReview
                          ? "Missing or low-confidence values detected. Route this sheet into the split-pane editor before publishing."
                          : "All core balancing values are present. This sheet is ready for a one-click master commit.";

              return (
                <article
                  key={item.id}
                  className={`rounded-[26px] border p-5 transition ${
                    item.needsManualReview
                      ? "border-[rgba(255,140,111,0.3)] bg-[rgba(255,140,111,0.08)]"
                      : "border-[rgba(212,175,55,0.2)] bg-[rgba(255,255,255,0.03)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-2xl text-[var(--foreground)]">
                        {item.draft?.name ?? item.file.name}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        {item.draft?.product_code || "No product code detected"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
                        item.needsManualReview
                          ? "border border-[rgba(255,140,111,0.3)] text-[var(--danger)]"
                          : "gold-chip"
                      }`}
                    >
                      {item.confidenceScore}% confidence
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-[18px] border border-[var(--accent-border)] bg-black/10 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        Fat
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--accent)]">
                        {item.draft?.fat_pct ?? 0}%
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-[var(--accent-border)] bg-black/10 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        Sugar
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--accent)]">
                        {item.draft?.sugar_pct ?? 0}%
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-[var(--accent-border)] bg-black/10 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        Solids
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--accent)]">
                        {item.draft?.total_solids_pct ?? 0}%
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
                    {statusMessage}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {quickCommitReady ? (
                      <button
                        type="button"
                        onClick={() => void handlePublish(item.id)}
                        disabled={item.status === "publishing" || item.status === "published"}
                        className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b1612] disabled:opacity-70"
                      >
                        {commitButtonLabel}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setActiveItemId(item.id)}
                      className="rounded-full border border-[var(--accent-border)] px-5 py-3 text-sm"
                    >
                      {item.needsManualReview ? "Manual Override" : "Open In Workbench"}
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-5 text-sm text-[var(--text-muted)] xl:col-span-3">
              Parse a batch first and the review cards will appear here with quick-commit actions.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
        <div className="luxury-card rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                PDF Viewer
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                Nutrition and balancing sections highlighted
              </h2>
            </div>
            {activeItem?.draft ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="gold-chip rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                  {activeItem.draft.extraction_source}
                </span>
                <span className="rounded-full border border-[var(--accent-border)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {activeItem.confidenceScore}% confidence
                </span>
              </div>
            ) : null}
          </div>

          {activeItem?.fileUrl ? (
            <div className="mt-5 overflow-hidden rounded-[28px] border border-[rgba(212,175,55,0.2)] bg-[#120f0d]">
              <div className="h-[720px]">
                <Worker workerUrl={PDF_WORKER_URL}>
                  <Viewer
                    fileUrl={activeItem.fileUrl}
                    defaultScale={SpecialZoomLevel.PageFit}
                    plugins={[search]}
                  />
                </Worker>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[28px] border border-[var(--accent-border)] bg-black/10 p-8 text-sm text-[var(--text-muted)]">
              Select a queued item to load its PDF and review form.
            </div>
          )}

          <div className="mt-5 rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Raw OCR Dump
              </p>
              <span className="text-xs text-[var(--text-muted)]">
                Stored with the master publish RPC
              </span>
            </div>
            <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-[18px] border border-[var(--accent-border)] bg-[rgba(255,255,255,0.02)] p-4 text-xs leading-6 text-[var(--text-muted)]">
              {activeItem?.parsed?.rawText ?? "Awaiting a selected PDF."}
            </pre>
          </div>
        </div>

        <aside className="luxury-card rounded-[32px] p-5 sm:p-6 lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Commit Form
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                Sticky master record editor
              </h2>
            </div>
            <span className="rounded-full border border-[var(--accent-border)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {masterIngredients.length} verified loaded
            </span>
          </div>
          {activeItem?.draft ? (
            <div className="mt-5 space-y-5">
              <section className="grid gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Product Metadata
                </p>
                <FormField
                  label="Name"
                  value={activeItem.draft.name}
                  onChange={(value) => handleDraftPatch({ name: value })}
                />
                <label className="grid gap-2">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Brand
                  </span>
                  <select
                    value={activeItem.draft.brand_name}
                    onChange={(event) => handleDraftPatch({ brand_name: event.target.value })}
                    className="rounded-[18px] border border-[rgba(212,175,55,0.24)] bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-[rgba(212,175,55,0.42)]"
                  >
                    <option value="" className="bg-[#1a1614]">
                      Select brand
                    </option>
                    {brandOptions.map((brand) => (
                      <option key={brand} value={brand} className="bg-[#1a1614]">
                        {brand}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    label="Product Code"
                    value={activeItem.draft.product_code}
                    onChange={(value) => handleDraftPatch({ product_code: value })}
                  />
                  <FormField
                    label="UPC"
                    value={activeItem.draft.upc}
                    onChange={(value) => handleDraftPatch({ upc: value })}
                  />
                </div>
                <FormField
                  label="Revision Date"
                  value={activeItem.draft.revision_date ?? ""}
                  onChange={(value) => handleDraftPatch({ revision_date: value || null })}
                />
              </section>

              <section className="grid gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  The Big Three
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField
                    label="Fat %"
                    type="number"
                    step="0.1"
                    value={activeItem.draft.fat_pct}
                    onChange={(value) => handleDraftPatch({ fat_pct: Number(value) || 0 })}
                  />
                  <FormField
                    label="Sugar %"
                    type="number"
                    step="0.1"
                    value={activeItem.draft.sugar_pct}
                    onChange={(value) => handleDraftPatch({ sugar_pct: Number(value) || 0 })}
                  />
                  <FormField
                    label="Total Solids %"
                    type="number"
                    step="0.1"
                    value={activeItem.draft.total_solids_pct}
                    onChange={(value) =>
                      handleDraftPatch({ total_solids_pct: Number(value) || 0 })
                    }
                  />
                </div>
              </section>

              <section className="grid gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  The Secondary Three
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField
                    label="PAC"
                    type="number"
                    step="0.1"
                    value={activeItem.draft.pac_value}
                    onChange={(value) => handleDraftPatch({ pac_value: Number(value) || 0 })}
                  />
                  <FormField
                    label="POD"
                    type="number"
                    step="0.1"
                    value={activeItem.draft.pod_value}
                    onChange={(value) => handleDraftPatch({ pod_value: Number(value) || 0 })}
                  />
                  <FormField
                    label="MSNF %"
                    type="number"
                    step="0.1"
                    value={activeItem.draft.msnf_pct}
                    onChange={(value) => handleDraftPatch({ msnf_pct: Number(value) || 0 })}
                  />
                </div>
              </section>

              <section className="grid gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Process and Audit
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      Process Mode
                    </span>
                    <select
                      value={activeItem.draft.is_cold_process ? "Cold" : "Hot"}
                      onChange={(event) =>
                        handleDraftPatch({ is_cold_process: event.target.value === "Cold" })
                      }
                      className="rounded-[18px] border border-[rgba(212,175,55,0.24)] bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-[rgba(212,175,55,0.42)]"
                    >
                      <option value="Cold" className="bg-[#1a1614]">
                        Cold
                      </option>
                      <option value="Hot" className="bg-[#1a1614]">
                        Hot
                      </option>
                    </select>
                  </label>
                  <FormField
                    label="Dosage g / kg"
                    type="number"
                    step="0.1"
                    value={activeItem.draft.dosage_guideline ?? 0}
                    onChange={(value) =>
                      handleDraftPatch({ dosage_guideline: Number(value) || null })
                    }
                  />
                  <FormField
                    label="Cost Per Container $"
                    type="number"
                    step="0.01"
                    value={activeItem.draft.cost_per_container ?? 0}
                    onChange={(value) =>
                      handleDraftPatch({ cost_per_container: Number(value) || 0 })
                    }
                  />
                  <FormField
                    label="Container Size g"
                    type="number"
                    step="0.1"
                    value={activeItem.draft.container_size_g ?? 1000}
                    onChange={(value) =>
                      handleDraftPatch({ container_size_g: Number(value) || 1000 })
                    }
                  />
                  <FormField
                    label="Market Cost / Kg"
                    type="number"
                    step="0.01"
                    value={activeItem.draft.average_market_cost}
                    onChange={(value) =>
                      handleDraftPatch({ average_market_cost: Number(value) || 0 })
                    }
                  />
                </div>
                <div className="rounded-[22px] border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.06)] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Extraction Source
                  </p>
                  <p className="mt-2 text-lg font-medium text-[var(--accent)]">
                    {activeItem.draft.extraction_source}
                  </p>
                </div>
              </section>

              {saveError ? (
                <div className="rounded-[22px] border border-[rgba(255,140,111,0.28)] bg-[rgba(255,140,111,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
                  {saveError}
                </div>
              ) : null}

              {saveSuccess ? (
                <div className="rounded-[22px] border border-[rgba(212,175,55,0.22)] bg-[rgba(212,175,55,0.08)] px-4 py-3 text-sm text-[var(--foreground)]">
                  {saveSuccess}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handlePublish()}
                  disabled={!canCommit || activeItem.status === "publishing"}
                  className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b1612] disabled:opacity-70"
                >
                  {activeItem.status === "publishing" ? "Publishing..." : "Commit To Master"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeItem.fileUrl) {
                      URL.revokeObjectURL(activeItem.fileUrl);
                      fileUrlsRef.current = fileUrlsRef.current.filter(
                        (url) => url !== activeItem.fileUrl
                      );
                    }

                    setQueue((current) => current.filter((item) => item.id !== activeItem.id));
                    setActiveItemId(null);
                  }}
                  className="rounded-full border border-[var(--accent-border)] px-5 py-3 text-sm"
                >
                  Remove From Queue
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-5 text-sm text-[var(--text-muted)]">
              Load a queue item to unlock the sticky metadata form and publish controls.
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
