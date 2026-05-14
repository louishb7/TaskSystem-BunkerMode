import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

export default function ProgressStrip({ completed = 0, label = "PROGRESSO", total = 0 }) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0;
  const percent = Math.round(ratio * 100);
  const remaining = Math.max(0, total - completed);
  const complete = total > 0 && completed === total;
  const off = total === 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, complete && styles.valueComplete, off && styles.valueOff]}>
          {off ? "OFF" : `${percent}%`}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, complete && styles.fillComplete, { width: `${percent}%` }]} />
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{off ? "DIA OFF" : `${completed}/${total} EXECUTADAS`}</Text>
        <Text style={styles.meta}>{remaining === 1 ? "1 RESTA" : `${remaining} RESTAM`}</Text>
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
    color: theme.colors.fire,
  },
  valueComplete: {
    color: theme.colors.success,
  },
  valueOff: {
    color: theme.colors.textMuted,
  },
  track: {
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.border,
    borderWidth: 1,
    height: 8,
    overflow: "hidden",
  },
  fill: {
    backgroundColor: theme.colors.fire,
    height: "100%",
  },
  fillComplete: {
    backgroundColor: theme.colors.success,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  meta: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    fontSize: 9,
  },
});
