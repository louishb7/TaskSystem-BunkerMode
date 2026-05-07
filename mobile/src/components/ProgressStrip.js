import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

export default function ProgressStrip({ completed = 0, label = "PROGRESSO", total = 0 }) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{total > 0 ? `${percent}%` : "0%"}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  value: {
    ...theme.typography.small,
    color: theme.colors.red,
  },
  track: {
    backgroundColor: "rgba(18,15,12,0.72)",
    borderColor: "rgba(245,240,232,0.14)",
    borderWidth: 1,
    height: 8,
    overflow: "hidden",
  },
  fill: {
    backgroundColor: theme.colors.red,
    height: "100%",
  },
});
