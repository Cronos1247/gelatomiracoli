import * as Speech from "expo-speech";
import { BlurView } from "expo-blur";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useState } from "react";
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
  onresult?: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror?: (() => void) | null;
  onend?: (() => void) | null;
  start: () => void;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

type MiracoliAssistFabProps = {
  hint?: string | null;
  message?: string | null;
  onSubmit: (command: string) => Promise<void>;
  onUndo?: () => Promise<void>;
  onDismiss?: () => void;
  bottomInset?: number;
};

export function MiracoliAssistFab({
  hint,
  message,
  onSubmit,
  onUndo,
  onDismiss,
  bottomInset = 30,
}: MiracoliAssistFabProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [isListening, setIsListening] = useState(false);

  async function submit() {
    if (!value.trim()) {
      return;
    }

    await onSubmit(value);
    setValue("");
    setOpen(false);
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
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
        return;
      }
    }

    await Speech.speak("Use iPhone dictation or type the command for Miracoli Assist.", {
      rate: 0.95,
    });
  }

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      {open ? (
        <BlurView
          intensity={18}
          tint="dark"
          style={[styles.panel, { bottom: 76 + bottomInset }]}
        >
          <Text style={styles.panelLabel}>MIRACOLI ASSIST</Text>
          {hint ? <Text style={styles.hintText}>{hint}</Text> : null}
          {message ? (
            <View style={styles.messageRow}>
              <Text style={styles.messageText}>{message}</Text>
              <View style={styles.messageActions}>
                {onUndo ? (
                  <Pressable onPress={() => void onUndo()}>
                    <Text style={styles.actionText}>UNDO</Text>
                  </Pressable>
                ) : null}
                {onDismiss ? (
                  <Pressable onPress={onDismiss}>
                    <Text style={styles.actionText}>HIDE</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Ask Miracoli Assist..."
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            multiline
          />
          <View style={styles.actions}>
            <Pressable onPress={() => void handleVoice()} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>{isListening ? "LISTENING" : "VOICE"}</Text>
            </Pressable>
            <Pressable onPress={() => void submit()} style={styles.primaryButton}>
              <Text style={styles.primaryText}>SEND</Text>
            </Pressable>
          </View>
        </BlurView>
      ) : null}

      <Pressable
        onPress={() => setOpen((current) => !current)}
        style={[styles.fab, { bottom: bottomInset, right: 20 }]}
      >
        <Text style={styles.fabText}>M</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: "absolute",
    right: 18,
    width: 280,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "rgba(0,0,0,0.9)",
    padding: 14,
    gap: 10,
  },
  panelLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: theme.typography.mono,
  },
  hintText: {
    color: theme.colors.text,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: theme.typography.mono,
  },
  messageRow: {
    gap: 8,
  },
  messageText: {
    color: theme.colors.text,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: theme.typography.mono,
  },
  messageActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  actionText: {
    color: theme.colors.text,
    fontSize: 10,
    fontFamily: theme.typography.mono,
  },
  input: {
    minHeight: 66,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    color: theme.colors.text,
    paddingHorizontal: 0,
    paddingVertical: 6,
    fontSize: 14,
    textAlignVertical: "top",
    fontFamily: theme.typography.mono,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#1A1A1A",
  },
  secondaryText: {
    color: theme.colors.text,
    fontSize: 10,
    fontFamily: theme.typography.mono,
  },
  primaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.text,
  },
  primaryText: {
    color: theme.colors.background,
    fontSize: 10,
    fontFamily: theme.typography.mono,
  },
  fab: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: {
    color: theme.colors.text,
    fontSize: 18,
    fontFamily: theme.typography.mono,
  },
});
