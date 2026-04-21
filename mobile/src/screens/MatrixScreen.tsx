import { useEffect, useMemo, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { Pressable, FlatList, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { GlassCard, GlassWrapper } from "../components/shared";
import {
  loadEquipmentSettings,
  type DisplayCaseRecord,
  type EquipmentUnitRecord,
} from "../lib/equipmentSettings";
import { theme } from "../theme";

type HardwareCard =
  | {
      id: string;
      kind: "display";
      title: string;
      subtitle: string;
      value: string;
      temp: number;
      meta: string;
    }
  | {
      id: string;
      kind: "production";
      title: string;
      subtitle: string;
      value: string;
      temp: null;
      meta: string;
    };

function buildHardwareCards(
  units: EquipmentUnitRecord[],
  displayCases: DisplayCaseRecord[]
): HardwareCard[] {
  const productionCards: HardwareCard[] = units.map((unit) => ({
    id: unit.id,
    kind: "production",
    title: `${unit.brand} ${unit.model}`,
    subtitle: "PRODUCTION UNIT",
    value: `${unit.min_batch_l.toFixed(1)}L - ${unit.max_batch_l.toFixed(1)}L`,
    temp: null,
    meta: "Locked Maestro batch range",
  }));

  const displayCards: HardwareCard[] = displayCases.map((displayCase) => ({
    id: displayCase.id,
    kind: "display",
    title: displayCase.name,
    subtitle: `DISPLAY // ${displayCase.style.toUpperCase()}`,
    value: `${displayCase.capacity_pans} pans`,
    temp: displayCase.target_temp_c,
    meta: `PAC ${displayCase.pac_range_min}-${displayCase.pac_range_max}`,
  }));

  return [...displayCards, ...productionCards];
}

function DigitalReadout({ value, accent = theme.colors.danger }: { value: string; accent?: string }) {
  const glow = useSharedValue(0.45);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [glow]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.76 + glow.value * 0.24,
    transform: [{ scale: 0.992 + glow.value * 0.016 }],
  }));

  return (
    <View style={styles.readoutShell}>
      <Reanimated.Text style={[styles.readoutValue, { color: accent }, animatedStyle]}>
        {value}
      </Reanimated.Text>
    </View>
  );
}

export function MatrixScreen({ onOpenHardware }: { onOpenHardware?: () => void }) {
  const [units, setUnits] = useState<EquipmentUnitRecord[]>([]);
  const [displayCases, setDisplayCases] = useState<DisplayCaseRecord[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const listWidthRef = useRef(1);

  useEffect(() => {
    let active = true;

    void loadEquipmentSettings().then((snapshot) => {
      if (!active) {
        return;
      }

      setUnits(snapshot.units);
      setDisplayCases(snapshot.displayCases);
    });

    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => buildHardwareCards(units, displayCases), [displayCases, units]);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / Math.max(event.nativeEvent.layoutMeasurement.width, 1)
    );

    if (nextIndex !== activeIndex) {
      void Haptics.selectionAsync();
      setActiveIndex(nextIndex);
    }
  };

  const activeCard = cards[activeIndex] ?? null;

  return (
    <GlassWrapper>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.kicker}>HARDWARE TELEMETRY</Text>
          <Text style={styles.title}>Matrix</Text>
          <Text style={styles.subtitle}>
            Swipe across live production and display modules with Maestro lockouts preserved.
          </Text>
        </View>

        <FlatList
          data={cards}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onMomentumScrollEnd={handleMomentumEnd}
          onLayout={(event) => {
            listWidthRef.current = event.nativeEvent.layout.width;
          }}
          contentContainerStyle={styles.carouselContent}
          renderItem={({ item }) => (
            <View style={[styles.carouselItem, { width: listWidthRef.current || 1 }]}>
              <GlassCard intensity={80} glowVariant="blue" style={styles.hardwareCard} contentStyle={styles.hardwareCardContent}>
                <View style={styles.statusDot} />
                <Text style={styles.cardKicker}>{item.subtitle}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{item.meta}</Text>

                {item.kind === "display" ? (
                  <View style={styles.readoutBlock}>
                    <Text style={styles.readoutLabel}>TARGET TEMP</Text>
                    <DigitalReadout value={`${item.temp?.toFixed(1) ?? "--"}°C`} />
                    <Text style={styles.capacityText}>{item.value}</Text>
                  </View>
                ) : (
                  <View style={styles.readoutBlock}>
                    <Text style={styles.readoutLabel}>PRODUCTION CAPACITY</Text>
                    <DigitalReadout value={item.value} accent={theme.colors.accent} />
                    <Text style={styles.capacityText}>Back of house batch envelope</Text>
                  </View>
                )}
              </GlassCard>
            </View>
          )}
        />

        <View style={styles.footer}>
          <Text style={styles.footerMeta}>
            {activeCard ? `${activeIndex + 1} / ${cards.length} // ${activeCard.title}` : "Loading telemetry"}
          </Text>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenHardware?.();
            }}
            style={styles.settingsButton}
          >
            <Text style={styles.settingsButtonText}>OPEN HARDWARE SETTINGS</Text>
          </Pressable>
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
    gap: 22,
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
  carouselContent: {
    paddingRight: 20,
  },
  carouselItem: {
    paddingRight: 16,
  },
  hardwareCard: {
    flex: 1,
    minHeight: 320,
  },
  hardwareCardContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 10,
    backgroundColor: "rgba(10, 10, 15, 0.5)",
  },
  statusDot: {
    alignSelf: "flex-end",
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.success,
    shadowColor: "rgba(0,230,118,0.85)",
    shadowOpacity: 0.85,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  cardKicker: {
    color: "#D4AF37",
    fontSize: 10,
    letterSpacing: 1.6,
    fontFamily: theme.typography.mono,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontFamily: theme.typography.serif,
  },
  cardMeta: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontFamily: theme.typography.mono,
  },
  readoutBlock: {
    marginTop: 16,
    gap: 12,
  },
  readoutLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: theme.typography.mono,
  },
  readoutShell: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#030303",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  readoutValue: {
    fontSize: 34,
    fontFamily: theme.typography.mono,
    fontWeight: "700",
    textShadowColor: "rgba(255, 7, 58, 0.75)",
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  capacityText: {
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: theme.typography.mono,
  },
  footer: {
    gap: 12,
  },
  footerMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: theme.typography.mono,
  },
  settingsButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.24)",
    backgroundColor: "rgba(0,229,255,0.08)",
    paddingVertical: 14,
    alignItems: "center",
  },
  settingsButtonText: {
    color: theme.colors.accent,
    fontSize: 11,
    letterSpacing: 1.6,
    fontFamily: theme.typography.mono,
  },
});
