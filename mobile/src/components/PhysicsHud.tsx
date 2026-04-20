import { Pressable, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "./shared";
import { theme } from "../theme";
import type { LabMetrics } from "../lab/useRecipeLab";

type PhysicsHudProps = {
  metrics: LabMetrics;
  solidsAdvice?: string | null;
  showSolidsAdvice?: boolean;
  onToggleSolidsAdvice?: () => void;
};

export function PhysicsHud({
  metrics,
  solidsAdvice,
  showSolidsAdvice,
  onToggleSolidsAdvice,
}: PhysicsHudProps) {
  const solidsColor =
    metrics.solids > 45
      ? styles.valueDanger
      : metrics.solids < 30
        ? styles.valueCold
        : styles.valueBalanced;
  const solidsBold = metrics.solids > 45;

  return (
    <View style={styles.shell}>
      <GlassCard glowVariant="blue" style={styles.hudCard} contentStyle={styles.hudCardContent}>
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
                  <Text style={[styles.value, solidsColor, solidsBold && styles.valueBold]}>
                    {`${metrics.solids.toFixed(1)}%`}
                  </Text>
                </Pressable>
                {solidsAdvice ? <Text style={styles.warningMark}>!</Text> : null}
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
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
  },
  hudCard: {
    width: "100%",
  },
  hudCardContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  bar: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },
  metricsRow: {
    flex: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 0,
    justifyContent: "center",
  },
  metric: {
    minWidth: 72,
    paddingRight: 16,
    marginRight: 16,
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
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: theme.typography.mono,
  },
  value: {
    color: "#FF073A",
    fontSize: 22,
    fontFamily: "Courier",
    textShadowColor: "rgba(255, 7, 58, 0.6)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  valueBalanced: {
    color: "#FF073A",
  },
  valueDanger: {
    color: theme.colors.danger,
  },
  valueCold: {
    color: "#60A5FA",
  },
  valueBold: {
    fontWeight: "800",
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
