import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

const typeStyles = {
  error: {
    backgroundColor: theme.colors.redWash,
    borderColor: theme.colors.red,
    color: theme.colors.red,
  },
  warning: {
    backgroundColor: theme.colors.amberWash,
    borderColor: theme.colors.amber,
    color: theme.colors.amber,
  },
  info: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    color: theme.colors.textMuted,
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
    width: "100%",
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  text: {
    ...theme.typography.caption,
  },
});
