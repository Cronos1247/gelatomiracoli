import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard, GlassWrapper } from "../components/shared";
import { theme } from "../theme";

type SettingsDetailScreenProps = {
  title: string;
  description: string;
  onBack: () => void;
};

export function SettingsDetailScreen({
  title,
  description,
  onBack,
}: SettingsDetailScreenProps) {
  return (
    <GlassWrapper>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <GlassCard contentStyle={styles.cardContent}>
          <Text style={styles.label}>SETTINGS DETAIL</Text>
          <Text style={styles.description}>{description}</Text>
        </GlassCard>
      </View>
    </GlassWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
    gap: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 32,
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "600",
    fontFamily: theme.typography.sans,
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 10,
    backgroundColor: "rgba(10, 10, 15, 0.45)",
  },
  label: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    fontFamily: theme.typography.mono,
  },
  description: {
    color: "#A3A3A3",
    fontSize: 14,
    lineHeight: 22,
    fontFamily: theme.typography.sans,
  },
});
