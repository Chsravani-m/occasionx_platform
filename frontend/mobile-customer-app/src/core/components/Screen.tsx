import React from "react";
import { StyleSheet, ActivityIndicator, View, Text } from "react-native";
import { colors } from "@/core/theme/colors";

// No SafeAreaView here - the outer shell (RootNavigator) already wraps
// AppHeader + this content area + AppFooter in a single SafeAreaView, so
// individual screens sit between two chrome elements that already
// account for the top/bottom insets. A SafeAreaView here too would pad
// twice.
export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.safe}>{children}</View>;
}

export function LoadingView({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

export function ErrorView({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingLabel: { marginTop: 12, color: colors.textMuted },
  errorText: { color: colors.danger, textAlign: "center" },
});
