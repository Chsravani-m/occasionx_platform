import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { colors } from "@/core/theme/colors";

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "outline";
  style?: ViewStyle;
}

export default function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
  style,
}: Props) {
  const isOutline = variant === "outline";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        isOutline ? styles.outline : styles.filled,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.primary : colors.white} />
      ) : (
        <Text style={isOutline ? styles.outlineText : styles.filledText}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  filled: { backgroundColor: colors.primary },
  outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.primary },
  filledText: { color: colors.white, fontWeight: "600", fontSize: 16 },
  outlineText: { color: colors.primary, fontWeight: "600", fontSize: 16 },
  disabled: { opacity: 0.5 },
});
