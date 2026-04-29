import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../styles/tokens";

export default function SectionBlock({ children, label, meta, style }) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      <View style={styles.rule} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.small,
    color: colors.red,
    fontWeight: "700",
  },
  rule: {
    backgroundColor: colors.red,
    height: 1,
    marginBottom: spacing.sm + spacing.xs,
    marginTop: spacing.sm,
    width: 56,
  },
});
