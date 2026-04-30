import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, spacing, surfaces, typography } from "../styles/tokens";
import { generalTheme } from "../styles/generalTheme";

const commandColors = generalTheme.colors;

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

export default function StatusNotice({ type = "info", message, tone = "default" }) {
  if (!message) {
    return null;
  }

  const selected = typeStyles[type] || typeStyles.info;
  const command = tone === "command";
  const commandSelected =
    type === "error" || type === "warning"
      ? {
          backgroundColor: commandColors.alertBg,
          borderColor: commandColors.alert,
          color: commandColors.alert,
        }
      : {
          backgroundColor: commandColors.panel,
          borderColor: commandColors.border,
          color: commandColors.muted,
        };
  const visibleStyle = command ? commandSelected : selected;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: visibleStyle.backgroundColor,
          borderColor: visibleStyle.borderColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: visibleStyle.color }]}>{message}</Text>
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
