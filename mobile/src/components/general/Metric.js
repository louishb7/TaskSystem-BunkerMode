import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../../theme/bunkermodeTheme";

export default function Metric({ label, value }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metricBox: {
    backgroundColor: "rgba(0,0,0,0.28)",
    borderColor: theme.colors.borderSoft,
    borderWidth: 1,
    flex: 1,
    padding: theme.spacing.sm,
  },
  metricLabel: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    fontSize: 9,
  },
  metricValue: {
    color: theme.colors.fire,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
    marginTop: theme.spacing.xs,
  },
});
