"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useChefAssistant } from "@/hooks/useChefAssistant";

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

type ChefCommandBarProps = {
  proactiveAlert?: string | null;
};

export function ChefCommandBar({ proactiveAlert }: ChefCommandBarProps) {
  const { t, i18n } = useTranslation();
  const { submit, response, error, loading, rotatingTips } = useChefAssistant();
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [listening, setListening] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [canListen, setCanListen] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % rotatingTips.length);
    }, 2800);

    return () => window.clearInterval(timer);
  }, [rotatingTips.length]);

  useEffect(() => {
    setCanListen(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

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
    recognition.lang = i18n.language === "it" ? "it-IT" : i18n.language === "es" ? "es-ES" : "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) {
        setMessage(transcript);
        setExpanded(true);
        void submit(transcript);
      }
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, [canListen, i18n.language, submit]);

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
    setExpanded(true);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
      <div className="w-full max-w-4xl rounded-[28px] border border-[rgba(212,175,55,0.24)] bg-[linear-gradient(180deg,rgba(44,38,33,0.96),rgba(26,22,20,0.98))] shadow-[0_-20px_80px_rgba(212,175,55,0.16)] backdrop-blur-xl">
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex h-3 w-full items-center justify-center rounded-[28px] py-4"
          >
            <span className="h-[12px] w-28 rounded-full bg-[rgba(212,175,55,0.32)] shadow-[0_0_24px_rgba(212,175,55,0.16)]" />
          </button>
        ) : null}

        {proactiveAlert ? (
          <div className="rounded-t-[28px] border-b border-[rgba(212,92,70,0.24)] bg-[rgba(212,92,70,0.08)] px-5 py-3 text-sm text-[#ffd7cf] animate-pulse">
            {proactiveAlert}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="rounded-full border border-[rgba(212,175,55,0.24)] bg-[rgba(212,175,55,0.12)] px-4 py-2 text-sm text-[var(--accent)]"
          >
            Maestro
          </button>
          <input
            value={message}
            onFocus={() => setExpanded(true)}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void submit(message);
              }
            }}
            placeholder={message ? t("commandBarPlaceholder") : rotatingTips[tipIndex]}
            className="min-w-0 flex-1 rounded-full border border-[rgba(212,175,55,0.18)] bg-[rgba(0,0,0,0.14)] px-4 py-3 text-sm outline-none transition focus:border-[rgba(212,175,55,0.42)]"
          />
          <button
            type="button"
            onClick={toggleListening}
            disabled={!canListen}
            className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition ${
              listening
                ? "border-[rgba(212,175,55,0.34)] bg-[rgba(212,175,55,0.12)] text-[var(--accent)]"
                : "border-[rgba(212,175,55,0.18)] text-[var(--text-muted)]"
            } disabled:opacity-50`}
          >
            {listening ? t("listening") : t("speak")}
          </button>
          <button
            type="button"
            onClick={() => void submit(message)}
            disabled={loading}
            className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[#1a1614] disabled:opacity-60"
          >
            {loading ? "..." : t("askTheMaestro")}
          </button>
        </div>

        {expanded ? (
          <div className="border-t border-[rgba(212,175,55,0.14)] px-4 py-4 sm:px-5">
            {error ? (
              <div className="rounded-[20px] border border-[rgba(212,92,70,0.24)] bg-[rgba(212,92,70,0.08)] px-4 py-3 text-sm text-[#ffd7cf]">
                {error}
              </div>
            ) : null}

            {response ? (
              <>
                <p className="mb-3 text-sm text-[var(--accent)]">{response.summary}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {response.cards.map((card) => (
                    <article
                      key={card.id}
                      className="rounded-[24px] border border-[rgba(212,175,55,0.18)] bg-[rgba(255,255,255,0.04)] p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                        {card.type === "recipe-preview"
                          ? "Recipe"
                          : card.type === "diagnostic"
                            ? "Diagnostic"
                            : "Note"}
                      </p>
                      <h4 className="mt-2 text-lg font-semibold">{card.title}</h4>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{card.subtitle}</p>
                      <div className="mt-3 space-y-2">
                        {card.bullets.map((bullet) => (
                          <p
                            key={bullet}
                            className="rounded-[18px] bg-[rgba(0,0,0,0.12)] px-3 py-2 text-sm text-[var(--text-primary)]"
                          >
                            {bullet}
                          </p>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
