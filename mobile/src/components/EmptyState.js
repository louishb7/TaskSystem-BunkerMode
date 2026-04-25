import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, spacing, typography } from "../styles/tokens";

export default function EmptyState() {
  return (
    <View style={styles.container}>
      <Text style={styles.symbol}>✓</Text>
      <Text style={styles.title}>Sem ordens no momento</Text>
      <Text style={styles.subtitle}>O General ainda nao definiu missoes para hoje.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.transparent,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  symbol: {
    ...typography.emptySymbol,
    color: colors.textMuted,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  subtitle: {
    ...typography.missionInstruction,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    maxWidth: layout.emptyMaxWidth,
    textAlign: "center",
  },
});
