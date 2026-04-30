import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, spacing, typography } from "../styles/tokens";

export default function EmptyState({ tone = "default" }) {
  const command = tone === "command";

  return (
    <View style={styles.container}>
      <Text style={[styles.symbol, command && styles.commandSymbol]}>✓</Text>
      <Text style={[styles.title, command && styles.commandTitle]}>Sem ordens no momento</Text>
      <Text style={[styles.subtitle, command && styles.commandSubtitle]}>O General ainda não definiu missões para hoje.</Text>
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
  commandSymbol: {
    color: "#6F776D",
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  commandTitle: {
    color: "#20231F",
  },
  subtitle: {
    ...typography.missionInstruction,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    maxWidth: layout.emptyMaxWidth,
    textAlign: "center",
  },
  commandSubtitle: {
    color: "#5E6A5F",
  },
});
