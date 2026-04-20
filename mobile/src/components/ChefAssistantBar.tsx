import * as Speech from "expo-speech";
import { BlurView } from "expo-blur";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { theme } from "../theme";

type BrowserSpeechRecognitionResult = {
  transcript?: string;
};

type BrowserSpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<BrowserSpeechRecognitionResult>>;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives?: number;
  onresult?: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror?: (() => void) | null;
  onend?: (() => void) | null;
  start: () => void;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

type ChefAssistantBarProps = {
  proactiveAlert?: string | null;
  onSubmit: (command: string) => Promise<void>;
  assistantMessage?: string | null;
  onUndo?: () => Promise<void>;
  onDismiss?: () => void;
  bottomInset?: number;
};

export function ChefAssistantBar({
  proactiveAlert,
  onSubmit,
  assistantMessage,
  onUndo,
  onDismiss,
  bottomInset = 0,
}: ChefAssistantBarProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  const tips = useMemo(
    () => [
      t("commandBarPlaceholder"),
      "Try: make this 5 liters",
      "Try: lower the sugar",
      "Try: switch to Italian",
    ],
    [t]
  );

  useEffect(() => {
    if (!expanded) {
      return;
    }

    const intervalId = setInterval(() => {
      setShowCursor((current) => !current);
    }, 500);

    return () => clearInterval(intervalId);
  }, [expanded]);

  async function submit() {
    if (!value.trim()) {
      return;
    }

    await onSubmit(value);
    setValue("");
    setExpanded(false);
  }

  async function handleVoice() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const browserWindow = window as typeof window & {
        SpeechRecognition?: BrowserSpeechRecognitionCtor;
        webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
      };
      const SpeechRecognitionCtor =
        browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

      if (SpeechRecognitionCtor) {
        const recognition = new SpeechRecognitionCtor() as unknown as BrowserSpeechRecognition;
        recognition.lang = "en-US";
        recognition.interimResults = false;
        setIsListening(true);
        recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
          const transcript = event.results[0]?.[0]?.transcript ?? "";
          setValue(transcript);
          setIsListening(false);
        };
        recognition.onerror = () => {
          setIsListening(false);
        };
        recognition.onend = () => {
          setIsListening(false);
        };
        recognition.start();
        return;
      }
    }

    await Speech.speak("Use iPhone keyboard dictation or type the command for Maestro.", {
      rate: 0.95,
      pitch: 1.02,
    });
  }

  return (
    <View style={styles.container}>
      {proactiveAlert ? (
        <View style={styles.alert}>
          <Text style={styles.alertText}>{proactiveAlert}</Text>
        </View>
      ) : null}

      {assistantMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{assistantMessage}</Text>
          <View style={styles.toastActions}>
            {onUndo ? (
              <Pressable onPress={() => void onUndo()} style={styles.toastButton}>
                <Text style={styles.toastButtonText}>{t("undo")}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onDismiss} style={styles.toastButton}>
              <Text style={styles.toastButtonText}>{t("dismiss")}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Pressable style={styles.barShell} onPress={() => setExpanded((current) => !current)}>
        <BlurView intensity={22} tint="dark" style={[styles.bar, { paddingBottom: 10 + bottomInset }]}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>MAESTRO</Text>
          <Text style={styles.barText}>
            {tips[0]}
            {showCursor ? " |" : ""}
          </Text>
        </BlurView>
      </Pressable>

      {expanded ? (
        <BlurView intensity={28} tint="dark" style={[styles.panel, { paddingBottom: 12 + bottomInset }]}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={tips[0]}
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            multiline
          />
          <View style={styles.actions}>
            <Pressable onPress={() => void handleVoice()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>
                {isListening ? t("listening") : t("voiceReady")}
              </Text>
            </Pressable>
            <Pressable onPress={() => void submit()} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{t("askTheMaestro")}</Text>
            </Pressable>
          </View>
        </BlurView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  alert: {
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  alertText: {
    color: theme.colors.danger,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.typography.mono,
  },
  toast: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 14,
    gap: 10,
  },
  toastText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.typography.mono,
  },
  toastActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  toastButton: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toastButtonText: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 12,
    fontFamily: theme.typography.mono,
  },
  barShell: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  bar: {
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
  },
  handle: {
    alignSelf: "center",
    width: 64,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: 8,
  },
  eyebrow: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
    fontFamily: theme.typography.mono,
  },
  barText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.typography.mono,
  },
  panel: {
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 14,
    gap: 12,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
  },
  input: {
    minHeight: 72,
    color: theme.colors.text,
    paddingHorizontal: 0,
    paddingVertical: 0,
    textAlignVertical: "top",
    fontSize: 15,
    fontFamily: theme.typography.mono,
    backgroundColor: "transparent",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontWeight: "800",
    fontSize: 14,
    fontFamily: theme.typography.mono,
  },
  secondaryButton: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: theme.typography.mono,
  },
});
