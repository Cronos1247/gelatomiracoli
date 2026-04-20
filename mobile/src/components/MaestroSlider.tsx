import { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { theme } from "../theme";

type MaestroSliderProps = {
  label: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  onChange: (value: number) => void;
  compact?: boolean;
};

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, value));
}

export function MaestroSlider({
  label,
  value,
  minimumValue,
  maximumValue,
  onChange,
  compact = false,
}: MaestroSliderProps) {
  const [trackWidth, setTrackWidth] = useState(1);
  const progress = useSharedValue(0);

  useEffect(() => {
    const ratio = (value - minimumValue) / Math.max(maximumValue - minimumValue, 1);
    progress.value = clamp(ratio, 0, 1);
  }, [maximumValue, minimumValue, progress, value]);

  const gesture = Gesture.Pan().onChange((event) => {
    const next = clamp(progress.value + event.changeX / Math.max(trackWidth, 1), 0, 1);
    progress.value = next;
    const actual = minimumValue + next * (maximumValue - minimumValue);
    runOnJS(onChange)(Math.round(actual * 10) / 10);
  });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * Math.max(trackWidth - 28, 0) }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: 14 + progress.value * Math.max(trackWidth - 14, 0),
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
        <Text style={[styles.value, compact && styles.valueCompact]}>{value.toFixed(1)}%</Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          style={[styles.track, compact && styles.trackCompact]}
          onLayout={(event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width)}
        >
          <Animated.View style={[styles.fill, fillStyle]} />
          <Animated.View style={[styles.thumb, compact && styles.thumbCompact, thumbStyle]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    color: theme.colors.text,
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: theme.typography.mono,
  },
  value: {
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: theme.typography.mono,
  },
  labelCompact: {
    fontSize: 10,
  },
  valueCompact: {
    fontSize: 10,
  },
  track: {
    height: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    paddingHorizontal: 7,
    overflow: "hidden",
  },
  trackCompact: {
    height: 18,
    paddingHorizontal: 5,
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  thumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.text,
  },
  thumbCompact: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
