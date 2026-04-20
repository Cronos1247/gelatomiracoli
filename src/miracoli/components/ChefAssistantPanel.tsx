"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMiracoliChefAssistant } from "@/hooks/useMiracoliChefAssistant";
import type {
  ChefAssistantContext,
  ChefAssistantRecipeDraft,
} from "@/lib/chef-assistant/types";

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
    SpeechRecognition?: new () => SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
  }

  interface SpeechRecognitionEvent {
    results: ArrayLike<{
      0: {
        transcript: string;
      };
      isFinal: boolean;
      length: number;
    }>;
  }
}

type ChefAssistantPanelProps = {
  context: ChefAssistantContext;
  onLoadIntoLab: (draft: ChefAssistantRecipeDraft) => void;
};

export function ChefAssistantPanel({ context, onLoadIntoLab }: ChefAssistantPanelProps) {
  const { ask, response, loading, error } = useMiracoliChefAssistant();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const canListen = useMemo(
    () => typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    []
  );

  useEffect(() => {
    if (!canListen || recognitionRef.current) {
      return;
    }

    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) {
        setMessage(transcript);
      }
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, [canListen]);

  const handleSubmit = async () => {
    if (!message.trim()) {
      return;
    }

    await ask(message, context);
  };

  const toggleListening = () => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      return;
    }

    if (listening) {
      recognition.stop();
      setListening(false);
      return;
    }

    recognition.start();
    setListening(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-6 right-6 z-40 rounded-full border border-[rgba(212,175,55,0.38)] bg-[rgba(44,38,33,0.86)] px-5 py-3 text-sm text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl transition hover:border-[rgba(212,175,55,0.58)] hover:bg-[rgba(58,49,42,0.92)]"
      >
        Ask the Maestro
      </button>

      {open ? (
        <aside className="fixed bottom-24 right-6 z-40 w-[min(420px,calc(100vw-2rem))] rounded-[30px] border border-[rgba(212,175,55,0.2)] bg-[linear-gradient(180deg,rgba(49,43,38,0.92),rgba(26,22,20,0.96))] p-5 text-[var(--text-primary)] shadow-[0_24px_100px_rgba(0,0,0,0.48)] backdrop-blur-xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
                Miracoli Chef Assistant
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">The Maestro</h3>
            </div>
            <div className="rounded-full border border-[rgba(212,175,55,0.18)] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
              Glass Lab
            </div>
          </div>

          <div className="rounded-[24px] border border-[rgba(212,175,55,0.16)] bg-[rgba(255,255,255,0.03)] p-4">
            <p className="text-sm text-[var(--text-muted)]">
              Ask for a draft or a diagnosis. Example: “I want a rich hazelnut recipe” or “My pistachio is too hard.”
            </p>
            <div className="mt-4 flex gap-2">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="What are we creating today?"
                className="min-w-0 flex-1 rounded-full border border-[rgba(212,175,55,0.18)] bg-[rgba(0,0,0,0.14)] px-4 py-3 text-sm outline-none transition focus:border-[rgba(212,175,55,0.4)]"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[#1a1614] transition hover:brightness-105 disabled:opacity-60"
              >
                {loading ? "Thinking" : "Ask"}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Ambient listening
              </p>
              <button
                type="button"
                onClick={toggleListening}
                disabled={!canListen}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition ${
                  listening
                    ? "border-[rgba(212,175,55,0.34)] bg-[rgba(212,175,55,0.12)] text-[var(--accent)]"
                    : "border-[rgba(212,175,55,0.18)] text-[var(--text-muted)]"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {listening ? "Listening..." : "Speak"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-[22px] border border-[rgba(212,92,70,0.28)] bg-[rgba(212,92,70,0.08)] p-4 text-sm text-[#f8d1c9]">
              {error}
            </div>
          ) : null}

          {response ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-[var(--accent)]">{response.summary}</p>
              {response.cards.map((card) => (
                <article
                  key={card.id}
                  className="rounded-[24px] border border-[rgba(212,175,55,0.18)] bg-[rgba(255,255,255,0.04)] p-4"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                    {card.type === "recipe-preview"
                      ? "Smart Recipe Card"
                      : card.type === "diagnostic"
                        ? "Diagnostic Card"
                        : "Kitchen Note"}
                  </p>
                  <h4 className="mt-2 text-lg font-semibold">{card.title}</h4>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{card.subtitle}</p>
                  <div className="mt-3 space-y-2 text-sm text-[var(--text-primary)]">
                    {card.bullets.map((bullet) => (
                      <p key={bullet} className="rounded-2xl bg-[rgba(0,0,0,0.12)] px-3 py-2">
                        {bullet}
                      </p>
                    ))}
                  </div>
                  {"recipeDraft" in card ? (
                    <button
                      type="button"
                      onClick={() => onLoadIntoLab(card.recipeDraft)}
                      className="mt-4 rounded-full border border-[rgba(212,175,55,0.32)] bg-[rgba(212,175,55,0.12)] px-4 py-2 text-sm text-[var(--accent)] transition hover:border-[rgba(212,175,55,0.48)] hover:bg-[rgba(212,175,55,0.18)]"
                    >
                      {card.ctaLabel}
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </aside>
      ) : null}
    </>
  );
}
