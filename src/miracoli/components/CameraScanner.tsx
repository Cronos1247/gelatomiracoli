"use client";

import { useEffect, useRef, useState } from "react";
import { parseNutritionLabelText, type NutritionProxyScan } from "@/lib/nutrition-proxy";

type CameraScannerProps = {
  onDetected: (scan: NutritionProxyScan) => void;
};

export function CameraScanner({ onDetected }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startCamera = async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError("Camera access was blocked. You can still type the nutrition values manually.");
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    setScanning(true);
    setError(null);

    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to start scanner.");
      }

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");

      try {
        const result = await worker.recognize(canvas);
        const parsed = parseNutritionLabelText(result.data.text ?? "");
        onDetected(parsed);
      } finally {
        await worker.terminate();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setOpen(false);
    } catch {
      setError("Nutrition scan could not read the label clearly. Try more light or hold the phone closer.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-[var(--accent-border)] bg-black/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Camera Scanner
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Point your iPhone camera at the nutrition panel and let Miracoli fill fat, carbs, and
            protein into proxy mode.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void startCamera()}
          className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm"
        >
          Open Camera
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3">
          <video
            ref={videoRef}
            className="w-full rounded-[22px] border border-[var(--accent-border)] bg-black/20"
            playsInline
            muted
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void captureFrame()}
              disabled={scanning}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#1b1612] disabled:opacity-60"
            >
              {scanning ? "Scanning..." : "Capture Nutrition Label"}
            </button>
            <button
              type="button"
              onClick={() => {
                streamRef.current?.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
                setOpen(false);
              }}
              className="rounded-full border border-[var(--accent-border)] px-4 py-2 text-sm"
            >
              Close Camera
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-[#ff9a75]">{error}</p> : null}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
