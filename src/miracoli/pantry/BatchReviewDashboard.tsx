"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  readProfileSettings,
  SESSION_KEYS,
  type ProfileSettings,
} from "@/lib/storage";
import {
  processBatchUpload,
  type BatchIngestionItem,
} from "./processBatchUpload";
import { BatchReviewTable } from "./BatchReviewTable";

const AUTO_COMMIT_CONFIDENCE = 80;

export function BatchReviewDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [envStatus, setEnvStatus] = useState<{
    hasSupabaseUrl: boolean;
    hasAnonKey: boolean;
    hasServiceRoleKey: boolean;
    hasMasterAdminUuid: boolean;
    missingForBatchPublish: string[];
    isBatchPublishReady: boolean;
  } | null>(null);
  const [items, setItems] = useState<BatchIngestionItem[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [directoryMode, setDirectoryMode] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setProfile(readProfileSettings());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadEnvStatus = async () => {
      try {
        const response = await fetch("/api/admin/env-status", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          hasSupabaseUrl: boolean;
          hasAnonKey: boolean;
          hasServiceRoleKey: boolean;
          hasMasterAdminUuid: boolean;
          missingForBatchPublish: string[];
          isBatchPublishReady: boolean;
        };

        if (!cancelled) {
          setEnvStatus(data);
        }
      } catch {
      }
    };

    void loadEnvStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!folderInputRef.current) {
      return;
    }

    if (directoryMode) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    } else {
      folderInputRef.current.removeAttribute("webkitdirectory");
      folderInputRef.current.removeAttribute("directory");
    }
  }, [directoryMode]);

  const commitBatchItems = async (
    targetItems: BatchIngestionItem[],
    options?: {
      feedbackPrefix?: string;
    }
  ) => {
    if (!targetItems.length) {
      return 0;
    }

    const targetIds = new Set(targetItems.map((item) => item.id));
    const originalStatuses = new Map(targetItems.map((item) => [item.id, item.status]));

    setIsCommitting(true);
    setFeedback(null);
    setError(null);
    setItems((current) =>
      current.map((item) =>
        targetIds.has(item.id) ? { ...item, status: "committing", errorMessage: null } : item
      )
    );

    try {
      const payload = targetItems
        .filter((item) => item.parsed)
        .map((item) => ({
          ...item.parsed?.extracted,
          raw_ocr_dump: item.parsed?.rawText ?? "",
          isVerified: true,
        }));

      const response = await fetch("/api/pantry/ingredient-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: payload }),
      });
      const data = (await response.json()) as {
        error?: string;
        committed?: number;
        items?: Array<{ name?: string; product_code?: string | null }>;
      };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Unable to commit verified ingredients.");
      }

      const committedKeys = new Set(
        (data.items ?? []).map((item) => item.product_code || item.name || "")
      );

      setItems((current) =>
        current.map((item) => {
          const key = item.parsed?.extracted.product_code || item.parsed?.extracted.name || "";

          if (committedKeys.has(key)) {
            return {
              ...item,
              status: "committed",
              isVerified: true,
              errorMessage: null,
            };
          }

          if (targetIds.has(item.id)) {
            return {
              ...item,
              status: originalStatuses.get(item.id) ?? item.status,
            };
          }

          return item;
        })
      );
      setFeedback(
        `${options?.feedbackPrefix ?? ""}${data.committed ?? targetItems.length} ingredients committed to Master Pantry.`
      );

      return data.committed ?? targetItems.length;
    } catch (commitError) {
      const message =
        commitError instanceof Error
          ? commitError.message
          : "Unable to commit the verified batch.";

      setError(message);
      setItems((current) =>
        current.map((item) =>
          targetIds.has(item.id)
            ? {
                ...item,
                status: originalStatuses.get(item.id) ?? item.status,
                errorMessage: message,
              }
            : item
        )
      );
      return 0;
    } finally {
      setIsCommitting(false);
    }
  };

  const handleBatchFiles = async (files: File[]) => {
    const pdfFiles = files.filter((file) => file.type === "application/pdf");

    if (!pdfFiles.length) {
      return;
    }

    setFeedback(null);
    setError(null);
    setSearchTerm("");
    setProgress({ completed: 0, total: pdfFiles.length });
    setItems(
      pdfFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        fileName: file.name,
        status: "processing",
        validation: null,
        confidenceScore: 0,
        balancingSnippet: null,
        isVerified: false,
        verificationReason: null,
        parsed: null,
        errorMessage: null,
      }))
    );

    try {
      const processed = await processBatchUpload(pdfFiles, {
        onProgress: ({ completed, total }) => {
          setProgress({ completed, total });
        },
      });

      setItems(processed);
      setProgress({ completed: processed.length, total: processed.length });

      const autoCommitTargets = processed.filter(
        (item) => item.parsed && item.confidenceScore >= AUTO_COMMIT_CONFIDENCE
      );

      if (autoCommitTargets.length) {
        await commitBatchItems(autoCommitTargets, {
          feedbackPrefix: `Auto-committed ${autoCommitTargets.length} sheets at ${AUTO_COMMIT_CONFIDENCE}%+ confidence. `,
        });
      } else {
        setFeedback(
          `${processed.filter((item) => item.status === "verified").length} of ${processed.length} sheets are verified for commit.`
        );
      }
    } catch (batchError) {
      setError(
        batchError instanceof Error
          ? batchError.message
          : "Unable to process the batch upload."
      );
    } finally {
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    useFsAccessApi: true,
    onDrop: (acceptedFiles) => {
      void handleBatchFiles(acceptedFiles);
    },
  });

  const verifiedItems = items.filter((item) => item.status === "verified");

  const handleCommitAll = async () => {
    if (!verifiedItems.length) {
      return;
    }

    await commitBatchItems(verifiedItems);
  };

  const handleDeleteItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const handleEditItem = async (id: string) => {
    const targetItem = items.find((item) => item.id === id);

    if (!targetItem?.parsed) {
      return;
    }

    try {
      const buffer = await targetItem.file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";

      for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
      }

      window.sessionStorage.setItem(
        SESSION_KEYS.workbenchDraft,
        JSON.stringify({
          fileName: targetItem.file.name,
          fileType: targetItem.file.type || "application/pdf",
          fileBase64: window.btoa(binary),
          parsed: targetItem.parsed,
        })
      );
      router.push("/admin/pantry?source=ingestion");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to move this PDF into the manual override workbench."
      );
    }
  };

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8">
        <section className="luxury-card rounded-[32px] px-8 py-10 text-center">
          <p className="text-sm text-[var(--text-muted)]">Loading ingestion vault...</p>
        </section>
      </main>
    );
  }

  if (!profile.isMasterAdmin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8">
        <section className="luxury-card max-w-2xl rounded-[32px] p-8 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">
            Protected Route
          </p>
          <h1 className="mt-3 font-serif text-4xl text-[var(--accent)]">Ingestion Vault</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            This route is reserved for the Miracoli master ingestion workflow. Enable Master Admin
            in your profile settings before opening the vault.
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

  const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <main className="min-h-screen bg-black px-4 py-6 sm:px-6 lg:px-10">
      <div className="sticky top-0 z-20 mx-auto mb-4 w-full max-w-7xl rounded-[8px] border border-[#262626] bg-[#000000f2] px-5 py-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white">
            Processing {progress.completed}/{progress.total || items.length} PreGel Sheets...
          </p>
          <div className="rounded-[4px] border border-[#262626] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {verifiedItems.length} verified
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-[4px] bg-[#111111]">
          <div
            className="h-full rounded-[4px] bg-[#a5b4fc] transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <section
        {...getRootProps()}
        className={`mx-auto flex min-h-[34vh] w-full max-w-7xl flex-col justify-between rounded-[8px] border border-dashed p-8 backdrop-blur-xl transition sm:p-10 ${
          isDragActive
            ? "border-[#a5b4fc] bg-[#080808] shadow-[0_0_24px_rgba(165,180,252,0.18)]"
            : "border-[#1a1a1a] bg-[#000000]"
        }`}
      >
        <input {...getInputProps()} />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(event) => {
            const nextFiles = Array.from(event.target.files ?? []);
            void handleBatchFiles(nextFiles);
            event.currentTarget.value = "";
          }}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">
              Ingestion Vault
            </p>
            <h1 className="mt-3 font-serif text-5xl tracking-[-0.05em] text-[var(--accent)]">
              Blast the folder. Verify the green lights.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">
              Drop the full PreGel directory, process it five sheets at a time, and only commit the
              rows with high-confidence physics.
            </p>
          </div>
          <Link
            href="/admin/pantry"
            className="rounded-[4px] border border-[#262626] px-5 py-3 text-sm transition hover:bg-[#121212]"
          >
            Open Workbench
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setDirectoryMode(true);
              window.setTimeout(() => folderInputRef.current?.click(), 0);
            }}
            className="rounded-[4px] bg-white px-5 py-3 text-sm font-semibold text-black"
          >
            Folder Upload
          </button>
          <button
            type="button"
            onClick={() => {
              setDirectoryMode(false);
              window.setTimeout(() => folderInputRef.current?.click(), 0);
            }}
            className="rounded-[4px] border border-[#262626] px-5 py-3 text-sm"
          >
            PDF Picker
          </button>
          <div className="rounded-[4px] border border-[#262626] px-4 py-3 text-sm text-[var(--text-muted)]">
            {isDragActive ? "Release to start the queue" : "Drag the entire folder into the vault"}
          </div>
        </div>
      </section>

      {feedback ? (
        <div className="mx-auto mt-6 w-full max-w-7xl rounded-[4px] border border-[#262626] bg-[#050505] px-4 py-3 text-sm text-[var(--foreground)]">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="mx-auto mt-6 w-full max-w-7xl rounded-[4px] border border-[#262626] bg-[#050505] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      {envStatus && !envStatus.isBatchPublishReady ? (
        <div className="mx-auto mt-6 w-full max-w-7xl rounded-[4px] border border-[#262626] bg-[#050505] px-4 py-3 text-sm text-[var(--danger)]">
          Batch master publish is not configured yet. Add these keys to <code>.env.local</code>:{" "}
          {envStatus.missingForBatchPublish.join(", ")}
        </div>
      ) : null}

      {envStatus?.isBatchPublishReady ? (
        <div className="mx-auto mt-6 w-full max-w-7xl rounded-[4px] border border-[#262626] bg-[#050505] px-4 py-3 text-sm text-[#a5b4fc]">
          Batch master publish is configured. Verified sheets can be committed to the Master Pantry.
        </div>
      ) : null}

      <div className="mx-auto mt-6 w-full max-w-7xl">
        <BatchReviewTable
          items={items}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onCommitAllVerified={() => void handleCommitAll()}
          onDeleteItem={handleDeleteItem}
          onEditItem={(id) => void handleEditItem(id)}
          isCommitting={isCommitting}
          verifiedCount={verifiedItems.length}
        />
      </div>
    </main>
  );
}
