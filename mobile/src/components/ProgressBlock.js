import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../styles/tokens";
import TacticalPanel from "./TacticalPanel";

export default function ProgressBlock({ metrics }) {
  return (
    <View style={styles.grid}>
      {metrics.map((metric) => (
        <TacticalPanel key={metric.label} style={styles.panel}>
          <Text style={styles.value}>{metric.value}</Text>
          <Text style={styles.label}>{metric.label}</Text>
        </TacticalPanel>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  panel: {
    flex: 1,
    padding: spacing.md,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "900",
  },
  label: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
