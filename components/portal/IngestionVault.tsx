"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { CheckCircle2, CloudUpload, ScanLine } from "lucide-react";

type ExtractionItem = {
  id: string;
  name: string;
  status: "processed";
};

const SEEDED_EXTRACTIONS: ExtractionItem[] = [
  {
    id: "pregel-diamante-50",
    name: "PreGel_Diamante_50.pdf",
    status: "processed",
  },
  {
    id: "superneutro-milk",
    name: "PreGel_Superneutro_Milk.pdf",
    status: "processed",
  },
];

function createExtractionId(fileName: string) {
  return `${fileName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function IngestionVault() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentExtractions, setRecentExtractions] =
    useState<ExtractionItem[]>(SEEDED_EXTRACTIONS);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const [file] = acceptedFiles;

    if (!file) {
      return;
    }

    setIsProcessing(true);

    window.setTimeout(() => {
      setRecentExtractions((current) => [
        {
          id: createExtractionId(file.name),
          name: file.name,
          status: "processed",
        },
        ...current,
      ]);
      setIsProcessing(false);
    }, 1500);
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
  } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    multiple: false,
    onDrop,
  });

  const dropZoneClassName = useMemo(() => {
    const base =
      "flex min-h-[24rem] flex-col items-center justify-center gap-6 rounded-[3rem] border-2 border-dashed p-16 text-center transition-all duration-300 ease-out";

    if (isDragActive || isDragAccept) {
      return `${base} border-[#00E5FF] bg-[#00E5FF]/[0.05] scale-[1.02] shadow-[0_0_40px_rgba(0,229,255,0.2)]`;
    }

    return `${base} border-white/20 bg-white/[0.02] backdrop-blur-xl`;
  }, [isDragAccept, isDragActive]);

  return (
    <main className="px-6 pb-10 pt-4 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-4 text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
            Data Scanner
          </p>
          <h1
            className="text-gradient-serif text-5xl tracking-[0.08em] text-white"
            style={{ fontFamily: "var(--font-miracoli-serif)" }}
          >
            INGESTION VAULT
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-white/56">
            Drop manufacturer technical sheets (PDF) for automated chemistry extraction.
          </p>
        </motion.div>

        <section className="mt-10">
          <motion.div
            initial={false}
            animate={
              isProcessing
                ? { scale: 0.985, opacity: 0.95 }
                : isDragActive || isDragAccept
                  ? { scale: 1.02, opacity: 1 }
                  : { scale: 1, opacity: 1 }
            }
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
          >
            <div {...getRootProps()} className={dropZoneClassName}>
              <input {...getInputProps()} />

              {isProcessing ? (
                <div className="flex w-full max-w-xl flex-col items-center gap-5">
                  <div className="rounded-full border border-white/10 bg-white/[0.04] p-5">
                    <ScanLine className="h-14 w-14 text-[#00E5FF]" />
                  </div>
                  <div className="w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="scan-line h-1 w-1/2 rounded-full"
                      animate={{ x: ["-120%", "220%"] }}
                      transition={{ duration: 1.15, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    />
                  </div>
                  <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#00E5FF]">
                    EXTRACTING PAC/POD DATA...
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 p-6 shadow-[0_0_32px_rgba(0,229,255,0.12)]">
                    <CloudUpload className="h-16 w-16 text-[#00E5FF]" />
                  </div>
                  <div className="space-y-3">
                    <p className="text-2xl text-white">Drop PDF technical sheets here</p>
                    <p className="text-sm text-white/54">
                      Drag a PreGel spec sheet or dairy certificate into the vault and let the scanner start reading its chemistry.
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          <div className="mt-5 flex justify-center">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/admin/ingestion"
              className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-white/82 transition hover:bg-white/[0.06] hover:text-white"
            >
              Open Advanced Ingestion Workbench
            </Link>
            </motion.div>
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
          className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.35)]"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/38">
                Recent Extractions
              </p>
              <p className="mt-2 text-sm text-white/54">
                Confirmed sheets that have completed chemistry parsing.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {recentExtractions.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-[#00E676]" />
                  <span className="text-sm text-white">{item.name}</span>
                </div>
                <span className="text-[11px] uppercase tracking-[0.22em] text-white/38">
                  Ready
                </span>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </main>
  );
}
