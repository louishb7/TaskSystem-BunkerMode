import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, spacing, typography } from "../styles/tokens";

const commandColors = {
  critical: "#A33A32",
  important: "#2F4A3A",
  standard: "#5E6A5F",
  muted: "#8A9187",
};

function getPriority(priority, tone) {
  const command = tone === "command";

  if (Number(priority) === 1) {
    return { color: command ? commandColors.critical : colors.red, label: "CRÍTICA" };
  }

  if (Number(priority) === 2) {
    return { color: command ? commandColors.important : colors.textPrimary, label: "IMPORTANTE" };
  }

  if (Number(priority) === 3) {
    return { color: command ? commandColors.standard : colors.textSecondary, label: "PADRÃO" };
  }

  return { color: command ? commandColors.muted : colors.textMuted, label: "-" };
}

export default function PriorityBar({ priority, tone }) {
  const selected = getPriority(priority, tone);

  return (
    <View style={styles.container}>
      <View style={[styles.bar, { backgroundColor: selected.color }]} />
      <Text style={[styles.label, { color: selected.color }]}>{selected.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm - spacing.xs / 2,
  },
  bar: {
    width: layout.priorityBarWidth,
    height: layout.priorityBarHeight,
    borderRadius: radius.sm,
  },
  label: {
    ...typography.small,
    fontWeight: "600",
  },
});
