import React from "react";
import { StyleSheet, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

export default function TacticalPanel({
  children,
  danger = false,
  elevated = false,
  fire = false,
  muted = false,
  purple = false,
  style,
}) {
  return (
    <View
      style={[
        styles.panel,
        muted && styles.muted,
        elevated && styles.elevated,
        fire && styles.fire,
        purple && styles.purple,
        danger && styles.danger,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "rgba(23,23,23,0.94)",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    overflow: "hidden",
    padding: theme.spacing.md,
  },
  danger: {
    borderColor: theme.colors.red,
  },
  fire: {
    backgroundColor: "rgba(20,20,20,0.95)",
    borderColor: "rgba(255,138,42,0.32)",
    ...theme.shadow.fire,
  },
  purple: {
    backgroundColor: "rgba(17,17,17,0.94)",
    borderColor: theme.colors.purpleBorder,
  },
  muted: {
    backgroundColor: "rgba(17,17,17,0.90)",
    borderColor: theme.colors.borderSoft,
  },
  elevated: {
    backgroundColor: "rgba(32,32,32,0.96)",
    borderColor: theme.colors.borderStrong,
    ...theme.shadow.raised,
  },
});
