import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

export default function SectionHeader({ action, eyebrow, meta, title, tone = "default" }) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={[styles.eyebrow, tone === "fire" && styles.eyebrowFire]}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: theme.spacing.md,
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    marginBottom: theme.spacing.xs,
  },
  eyebrowFire: {
    color: theme.colors.fire,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  action: {
    flexShrink: 0,
  },
});
