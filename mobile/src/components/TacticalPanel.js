import React from "react";
import { StyleSheet, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

export default function TacticalPanel({
  children,
  danger = false,
  elevated = false,
  muted = false,
  style,
}) {
  return (
    <View
      style={[
        styles.panel,
        muted && styles.muted,
        elevated && styles.elevated,
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
    backgroundColor: "rgba(36,33,27,0.92)",
    borderColor: "rgba(245,240,232,0.16)",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    overflow: "hidden",
    padding: theme.spacing.md,
  },
  danger: {
    borderColor: theme.colors.red,
  },
  muted: {
    backgroundColor: "rgba(18,15,12,0.88)",
    borderColor: "rgba(245,240,232,0.1)",
  },
  elevated: {
    backgroundColor: "rgba(48,43,35,0.94)",
    borderColor: "rgba(245,240,232,0.2)",
  },
});
