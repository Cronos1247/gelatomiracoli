import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { LabIngredient } from "../lab/useRecipeLab";
import { theme } from "../theme";

type IngredientRowProps = {
  ingredient: LabIngredient;
  onChangeGrams: (grams: number) => void;
  onToggleLock: () => void;
};

export function IngredientRow({ ingredient, onChangeGrams, onToggleLock }: IngredientRowProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.row}>
      <View style={styles.nameWrap}>
        <Text style={styles.name}>{ingredient.name}</Text>
        <Text style={styles.meta}>{ingredient.category ?? "Ingredient"}</Text>
      </View>

      <View style={styles.center}>
        <TextInput
          value={String(Math.round(ingredient.grams))}
          onChangeText={(text) => {
            const next = Number(text.replace(/[^0-9.]/g, ""));
            if (!Number.isNaN(next)) {
              onChangeGrams(next);
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType="decimal-pad"
          style={[styles.input, isFocused && styles.inputFocused]}
        />
        <Text style={styles.unit}>g</Text>
      </View>

      <Pressable
        onPress={onToggleLock}
        style={[styles.lockButton, ingredient.locked && styles.lockButtonActive]}
      >
        <Text style={[styles.lockLabel, ingredient.locked && styles.lockLabelActive]}>
          {ingredient.locked ? "LOCK" : "OPEN"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  nameWrap: {
    flex: 1.4,
    gap: 4,
  },
  name: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700",
    fontFamily: theme.typography.sans,
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontFamily: theme.typography.mono,
  },
  center: {
    flex: 0.95,
    alignItems: "center",
  },
  input: {
    minWidth: 88,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700",
    paddingVertical: 8,
    textAlign: "center",
    backgroundColor: "transparent",
    fontFamily: theme.typography.mono,
  },
  inputFocused: {
    borderColor: theme.colors.text,
  },
  unit: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 4,
    fontFamily: theme.typography.mono,
  },
  lockButton: {
    minWidth: 70,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  lockButtonActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  lockLabel: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    fontFamily: theme.typography.mono,
  },
  lockLabelActive: {
    color: theme.colors.background,
  },
});
