import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";
import BrandSymbol from "./BrandSymbol";

export default function EmptyState({
  message = "O General ainda não definiu missões para hoje.",
  title = "Sem ordens no momento",
}) {
  return (
    <View style={styles.container}>
      <BrandSymbol muted size={56} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: theme.colors.transparent,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    maxWidth: 280,
    textAlign: "center",
  },
});
