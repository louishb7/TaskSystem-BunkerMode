import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, spacing, surfaces, typography } from "../styles/tokens";

const typeStyles = {
  error: {
    backgroundColor: surfaces.redBg,
    borderColor: colors.red,
    color: colors.red,
  },
  warning: {
    backgroundColor: surfaces.amberBg,
    borderColor: colors.red,
    color: colors.red,
  },
  info: {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderStrong,
    color: colors.textSecondary,
  },
};

export default function StatusNotice({ type = "info", message }) {
  if (!message) {
    return null;
  }

  const selected = typeStyles[type] || typeStyles.info;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: selected.backgroundColor,
          borderColor: selected.borderColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: selected.color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: layout.fullWidth,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
  },
  text: {
    ...typography.notice,
  },
});
