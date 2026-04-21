import { useEffect, useMemo, useState } from "react";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard, GlassWrapper } from "../components/shared";
import { theme } from "../theme";

type ExtractionRecord = {
  id: string;
  fileName: string;
  createdAt: number;
};

function AnimatedProgress() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(0.82, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.18, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${18 + progress.value * 64}%`,
    opacity: 0.7 + progress.value * 0.3,
  }));

  return (
    <View style={styles.progressTrack}>
      <Reanimated.View style={[styles.progressFill, fillStyle]} />
    </View>
  );
}

export function ScannerScreen() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentExtractions, setRecentExtractions] = useState<ExtractionRecord[]>([]);

  const latestExtraction = useMemo(() => recentExtractions[0] ?? null, [recentExtractions]);

  async function handleScanSpecSheet() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const fileName =
      asset.fileName?.trim() ||
      asset.uri.split("/").pop() ||
      `spec-sheet-${Date.now()}.jpg`;

    setIsProcessing(true);
    await Haptics.selectionAsync();

    setTimeout(() => {
      setRecentExtractions((current) => [
        {
          id: `${Date.now()}`,
          fileName,
          createdAt: Date.now(),
        },
        ...current,
      ]);
      setIsProcessing(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2200);
  }

  return (
    <GlassWrapper>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.kicker}>INGESTION VAULT</Text>
          <Text style={styles.title}>Scanner</Text>
          <Text style={styles.subtitle}>
            Capture manufacturer spec sheets and push them into the chemistry pipeline.
          </Text>
        </View>

        <GlassCard intensity={80} glowVariant="blue" style={styles.scannerCard} contentStyle={styles.scannerCardContent}>
          {isProcessing ? (
            <View style={styles.processingState}>
              <MaterialCommunityIcons name="line-scan" size={42} color={theme.colors.accent} />
              <Text style={styles.processingTitle}>Processing...</Text>
              <AnimatedProgress />
              <Text style={styles.processingMeta}>EXTRACTING PAC/POD DATA....</Text>
            </View>
          ) : (
            <View style={styles.scannerIdle}>
              <MaterialCommunityIcons name="file-document-outline" size={54} color={theme.colors.accent} />
              <Text style={styles.scannerTitle}>Data Scanner Ready</Text>
              <Text style={styles.scannerCopy}>
                Aim at a technical sheet or capture a fresh supplier spec directly from the floor.
              </Text>
              <Pressable onPress={() => void handleScanSpecSheet()} style={styles.scanButton}>
                <Text style={styles.scanButtonText}>SCAN SPEC SHEET</Text>
              </Pressable>
            </View>
          )}
        </GlassCard>

        <View style={styles.listShell}>
          <Text style={styles.listTitle}>RECENT EXTRACTIONS</Text>
          {recentExtractions.length === 0 ? (
            <GlassCard style={styles.emptyCard} contentStyle={styles.emptyCardContent}>
              <Text style={styles.emptyText}>No captures yet. Your next scan will appear here.</Text>
            </GlassCard>
          ) : (
            recentExtractions.slice(0, 4).map((record) => (
              <GlassCard key={record.id} style={styles.extractionCard} contentStyle={styles.extractionCardContent}>
                <View style={styles.extractionRow}>
                  <View style={styles.checkIconWrap}>
                    <MaterialCommunityIcons name="check-circle" size={18} color={theme.colors.success} />
                  </View>
                  <View style={styles.extractionMeta}>
                    <Text style={styles.extractionName}>{record.fileName}</Text>
                    <Text style={styles.extractionTimestamp}>
                      {new Date(record.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ))
          )}
          {latestExtraction ? (
            <Text style={styles.footerMeta}>Latest queued capture: {latestExtraction.fileName}</Text>
          ) : null}
        </View>
      </View>
    </GlassWrapper>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 112,
    gap: 20,
  },
  header: {
    gap: 8,
  },
  kicker: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.8,
    fontFamily: theme.typography.mono,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontFamily: theme.typography.serif,
  },
  subtitle: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 21,
    fontFamily: theme.typography.sans,
  },
  scannerCard: {
    minHeight: 320,
  },
  scannerCardContent: {
    paddingHorizontal: 22,
    paddingVertical: 24,
    backgroundColor: "rgba(10, 10, 15, 0.5)",
  },
  scannerIdle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  scannerTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontFamily: theme.typography.serif,
    textAlign: "center",
  },
  scannerCopy: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    fontFamily: theme.typography.sans,
  },
  scanButton: {
    marginTop: 12,
    width: "100%",
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "rgba(0,229,255,0.55)",
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  scanButtonText: {
    color: "#051018",
    fontSize: 13,
    letterSpacing: 1.8,
    fontFamily: theme.typography.mono,
    fontWeight: "700",
  },
  processingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  processingTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontFamily: theme.typography.serif,
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  processingMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    letterSpacing: 1.6,
    fontFamily: theme.typography.mono,
  },
  listShell: {
    gap: 10,
  },
  listTitle: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.8,
    fontFamily: theme.typography.mono,
  },
  emptyCard: {},
  emptyCardContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyText: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontFamily: theme.typography.mono,
  },
  extractionCard: {},
  extractionCardContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  extractionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkIconWrap: {
    width: 28,
    alignItems: "center",
  },
  extractionMeta: {
    flex: 1,
    gap: 4,
  },
  extractionName: {
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: theme.typography.sans,
  },
  extractionTimestamp: {
    color: theme.colors.muted,
    fontSize: 11,
    fontFamily: theme.typography.mono,
  },
  footerMeta: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.1,
    fontFamily: theme.typography.mono,
  },
});
