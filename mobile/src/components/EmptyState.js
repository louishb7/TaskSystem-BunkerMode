import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, spacing, typography } from "../styles/tokens";
import { generalTheme } from "../styles/generalTheme";

const commandColors = generalTheme.colors;

export default function EmptyState({
  message = "O General ainda não definiu missões para hoje.",
  title = "Sem ordens no momento",
  tone = "default",
}) {
  const command = tone === "command";

  return (
    <View style={styles.container}>
      <Text style={[styles.symbol, command && styles.commandSymbol]}>✓</Text>
      <Text style={[styles.title, command && styles.commandTitle]}>{title}</Text>
      <Text style={[styles.subtitle, command && styles.commandSubtitle]}>{message}</Text>
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
    color: commandColors.muted,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  commandTitle: {
    color: commandColors.ink,
  },
  subtitle: {
    ...typography.missionInstruction,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    maxWidth: layout.emptyMaxWidth,
    textAlign: "center",
  },
  commandSubtitle: {
    color: commandColors.muted,
  },
});
