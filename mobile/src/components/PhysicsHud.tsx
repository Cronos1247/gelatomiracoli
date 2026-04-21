import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { GlassCard } from "./shared";
import { theme } from "../theme";
import type { LabMetrics } from "../lab/useRecipeLab";

type PhysicsHudProps = {
  metrics: LabMetrics;
  solidsAdvice?: string | null;
  showSolidsAdvice?: boolean;
  onToggleSolidsAdvice?: () => void;
};

function AnimatedMetricValue({
  value,
  tone = "red",
}: {
  value: string;
  tone?: "red" | "blue";
}) {
  const glow = useSharedValue(0.48);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.48, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [glow]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.84 + glow.value * 0.16,
    transform: [{ scale: 0.992 + glow.value * 0.02 }],
  }));

  return (
    <Reanimated.Text
      style={[
        styles.value,
        tone === "blue" ? styles.valueCold : styles.valueBalanced,
        animatedStyle,
      ]}
    >
      {value}
    </Reanimated.Text>
  );
}

export function PhysicsHud({
  metrics,
  solidsAdvice,
  showSolidsAdvice,
  onToggleSolidsAdvice,
}: PhysicsHudProps) {
  const solidsBold = metrics.solids > 45;
  const solidsTone = metrics.solids < 30 ? "blue" : "red";

  return (
    <View style={styles.shell}>
      <GlassCard
        intensity={72}
        style={styles.hudCard}
        contentStyle={styles.hudCardContent}
      >
        <View style={styles.bar}>
          <View style={styles.metricsRow}>
            <Metric label="PAC" value={metrics.pac.toFixed(0)} />
            <Metric label="POD" value={metrics.pod.toFixed(1)} />
            <View style={[styles.metric, styles.metricLast]}>
              <Text style={styles.label}>SOLIDS</Text>
              <View style={styles.solidsValueRow}>
                <Pressable
                  disabled={!solidsAdvice}
                  onPress={onToggleSolidsAdvice}
                  hitSlop={10}
                  style={styles.solidsTrigger}
                >
                  <Reanimated.View>
                    <AnimatedMetricValue value={`${metrics.solids.toFixed(1)}%`} tone={solidsTone} />
                  </Reanimated.View>
                </Pressable>
                {solidsAdvice ? (
                  <Text style={[styles.warningMark, solidsBold && styles.warningMarkStrong]}>!</Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </GlassCard>

      {solidsAdvice && showSolidsAdvice ? (
        <GlassCard style={styles.tooltip} contentStyle={styles.tooltipContent}>
          <Text style={styles.tooltipText}>{solidsAdvice}</Text>
        </GlassCard>
      ) : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      <AnimatedMetricValue value={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  hudCard: {
    width: "100%",
    maxWidth: 392,
    alignSelf: "center",
  },
  hudCardContent: {
    paddingHorizontal: 24,
    paddingVertical: 22,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  bar: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    width: "100%",
  },
  metricsRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metric: {
    flex: 1,
    minWidth: 0,
    paddingRight: 14,
    marginRight: 14,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  metricLast: {
    paddingRight: 0,
    marginRight: 0,
    borderRightWidth: 0,
  },
  label: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 8,
    fontFamily: theme.typography.mono,
  },
  value: {
    fontSize: 34,
    fontFamily: theme.typography.mono,
    fontWeight: "700",
    textShadowRadius: 15,
    textShadowOffset: { width: 0, height: 0 },
  },
  valueBalanced: {
    color: "#FF073A",
    textShadowColor: "rgba(255, 7, 58, 0.5)",
  },
  valueCold: {
    color: "#FF073A",
    textShadowColor: "rgba(255, 7, 58, 0.5)",
  },
  solidsValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  solidsTrigger: {
    minWidth: 60,
  },
  warningMark: {
    color: "#FFB866",
    fontSize: 12,
    fontFamily: theme.typography.mono,
  },
  warningMarkStrong: {
    textShadowColor: "rgba(255, 184, 102, 0.5)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  tooltip: {
    maxWidth: "80%",
    alignSelf: "center",
  },
  tooltipContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(10, 10, 15, 0.55)",
  },
  tooltipText: {
    color: theme.colors.text,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: theme.typography.mono,
  },
});
