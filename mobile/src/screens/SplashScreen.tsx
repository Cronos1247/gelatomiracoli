import { Platform, StyleSheet, Text, View } from "react-native";
import type { MobileLanguage } from "../i18n";

type SplashScreenProps = {
  language: MobileLanguage;
};

const SUBTITLE_COPY: Record<
  MobileLanguage,
  { artisan: string; precision: string }
> = {
  en: {
    artisan: "ARTISAN SOUL",
    precision: "DIGITAL PRECISION",
  },
  es: {
    artisan: "ALMA ARTESANAL",
    precision: "PRECISION DIGITAL",
  },
  it: {
    artisan: "ANIMA ARTIGIANA",
    precision: "PRECISIONE DIGITALE",
  },
};

const METRICS = [
  { label: "PAC", value: "180" },
  { label: "POD", value: "8.0" },
  { label: "SOLIDS", value: "38.5%" },
];

export function SplashScreen({ language }: SplashScreenProps) {
  const subtitle = SUBTITLE_COPY[language] ?? SUBTITLE_COPY.en;

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.emblemFrame}>
          <View style={[styles.ring, styles.ringOuter]} />
          <View style={[styles.ring, styles.ringMiddle]} />
          <View style={[styles.ring, styles.ringInner]} />
          <View style={[styles.scoopOrbit, styles.scoopOrbitLeft]} />
          <View style={[styles.scoopOrbit, styles.scoopOrbitRight]} />
          <View style={styles.verticalLine} />
          <View style={styles.metricsRail}>
            {METRICS.map((metric) => (
              <View key={metric.label} style={styles.metricBlock}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>{metric.value}</Text>
              </View>
            ))}
          </View>
          <View style={styles.coreGlow} />
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.brand}>GELATO MIRACOLI</Text>
          <View style={styles.subtitleRow}>
            <Text style={styles.artisan}>{subtitle.artisan}</Text>
            <View style={styles.subtitleDivider} />
            <Text style={styles.precision}>{subtitle.precision}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.footer}>POWERED BY MIRACOLI PHYSICS ENGINE</Text>
    </View>
  );
}

const serifFamily = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "serif",
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 72,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  hero: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  emblemFrame: {
    width: 252,
    height: 252,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(228, 214, 171, 0.85)",
    backgroundColor: "transparent",
  },
  ringOuter: {
    width: 220,
    height: 220,
    opacity: 0.72,
  },
  ringMiddle: {
    width: 176,
    height: 176,
    opacity: 0.82,
  },
  ringInner: {
    width: 128,
    height: 128,
    opacity: 0.92,
  },
  scoopOrbit: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
  },
  scoopOrbitLeft: {
    left: 34,
    top: 44,
    transform: [{ rotate: "-28deg" }],
  },
  scoopOrbitRight: {
    right: 34,
    top: 44,
    transform: [{ rotate: "28deg" }],
  },
  verticalLine: {
    position: "absolute",
    width: 1,
    height: 210,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.85,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  metricsRail: {
    position: "absolute",
    right: 38,
    top: 52,
    gap: 16,
  },
  metricBlock: {
    minWidth: 72,
    gap: 2,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255, 255, 255, 0.32)",
  },
  metricLabel: {
    color: "#6F6F6F",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  metricValue: {
    color: "#F7F7F7",
    fontSize: 15,
    letterSpacing: 0.6,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
  coreGlow: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(230, 217, 180, 0.5)",
  },
  copyBlock: {
    alignItems: "center",
    gap: 10,
  },
  brand: {
    color: "#D8C38B",
    fontSize: 30,
    letterSpacing: 2.6,
    fontFamily: serifFamily,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  artisan: {
    color: "#707070",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.2,
  },
  subtitleDivider: {
    width: 18,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  precision: {
    color: "#A9A9A9",
    fontSize: 11,
    letterSpacing: 2,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
  footer: {
    color: "#5F5F5F",
    fontSize: 10,
    letterSpacing: 1.8,
    textAlign: "center",
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
});
