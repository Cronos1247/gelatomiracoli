"use client";

import { useDropzone } from "react-dropzone";

export type BatchQueueItemStatus =
  | "processing"
  | "pending-review"
  | "publishing"
  | "published"
  | "error";

export type BatchQueueListItem = {
  id: string;
  fileName: string;
  extractedName: string;
  status: BatchQueueItemStatus;
  extractionSource: string;
  confidenceScore: number;
  needsManualReview: boolean;
  errorMessage: string | null;
};

type BatchPantryUploadProps = {
  activeItemId: string | null;
  items: BatchQueueListItem[];
  processingTotal: number;
  processingCompleted: number;
  onFilesAdded: (files: File[]) => void;
  onSelect: (id: string) => void;
};

function statusLabel(status: BatchQueueItemStatus) {
  switch (status) {
    case "processing":
      return "Processing";
    case "pending-review":
      return "Ready";
    case "publishing":
      return "Publishing";
    case "published":
      return "Committed";
    case "error":
      return "Commit Failed";
    default:
      return "Pending";
  }
}

function confidenceTone(confidenceScore: number) {
  if (confidenceScore >= 85) {
    return "text-[var(--accent)]";
  }

  if (confidenceScore >= 70) {
    return "text-[#e7d39d]";
  }

  return "text-[var(--danger)]";
}

export function BatchPantryUpload({
  activeItemId,
  items,
  processingTotal,
  processingCompleted,
  onFilesAdded,
  onSelect,
}: BatchPantryUploadProps) {
  const progressPct =
    processingTotal > 0 ? Math.round((processingCompleted / processingTotal) * 100) : 0;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 50,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length) {
        onFilesAdded(acceptedFiles.slice(0, 50));
      }
    },
  });

  return (
    <section className="luxury-card rounded-[32px] p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
            Batch Pantry Upload
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            Blast up to 50 tech sheets, then verify the clean hits
          </h2>
        </div>
        <div className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm text-[var(--text-muted)]">
          {items.length} items in queue
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`mt-5 rounded-[28px] border border-dashed px-6 py-8 text-center transition ${
          isDragActive
            ? "border-[rgba(212,175,55,0.38)] bg-[rgba(212,175,55,0.1)]"
            : "border-[rgba(212,175,55,0.28)] bg-black/10"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">
          Queue Drop Zone
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
          {isDragActive ? "Release to start the batch parse" : "Drag a full folder of PDFs here"}
        </h3>
        <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">
          Files are parsed in parallel, scored for confidence, and routed straight into rapid-fire
          review or manual override.
        </p>
        {processingTotal > 0 ? (
          <div className="mx-auto mt-6 max-w-3xl">
            <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#c79a1f,#f5d37a)] transition-[width] duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-[var(--accent)]">
              {processingCompleted} / {processingTotal} sheets processed
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 overflow-hidden rounded-[26px] border border-[var(--accent-border)] bg-black/10">
        <div className="grid grid-cols-[minmax(0,1.8fr)_150px_130px] gap-3 border-b border-[var(--accent-border)] px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
          <span>File Name</span>
          <span>Status</span>
          <span>Confidence</span>
        </div>

        {items.length ? (
          <div className="divide-y divide-[rgba(212,175,55,0.08)]">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`grid w-full grid-cols-[minmax(0,1.8fr)_150px_130px] gap-3 px-4 py-4 text-left transition ${
                  activeItemId === item.id
                    ? "bg-[rgba(212,175,55,0.08)]"
                    : "bg-transparent hover:bg-[rgba(255,255,255,0.02)]"
                } ${item.needsManualReview ? "shadow-[inset_3px_0_0_0_rgba(255,140,111,0.9)]" : ""}`}
              >
                <div className="min-w-0">
                  <p className="truncate font-serif text-lg text-[var(--foreground)]">
                    {item.extractedName || item.fileName}
                  </p>
                  <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{item.fileName}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {item.extractionSource}
                    {item.errorMessage ? ` - ${item.errorMessage}` : ""}
                  </p>
                </div>
                <div className="flex items-center">
                  <span className="gold-chip rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                    {statusLabel(item.status)}
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className={`text-sm font-semibold tracking-[0.04em] ${confidenceTone(item.confidenceScore)}`}
                  >
                    {item.confidenceScore}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-5 py-6 text-sm text-[var(--text-muted)]">
            The queue is empty. Drop a full batch of PDFs to begin the rapid review cycle.
          </div>
        )}
      </div>
    </section>
  );
}

export const BatchUploadQueue = BatchPantryUpload;
