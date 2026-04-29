import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, spacing, typography } from "../styles/tokens";

function getPriority(priority) {
  if (Number(priority) === 1) {
    return { color: colors.red, label: "CRITICA" };
  }

  if (Number(priority) === 2) {
    return { color: colors.textPrimary, label: "IMPORTANTE" };
  }

  if (Number(priority) === 3) {
    return { color: colors.textSecondary, label: "PADRAO" };
  }

  return { color: colors.textMuted, label: "-" };
}

export default function PriorityBar({ priority }) {
  const selected = getPriority(priority);

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
