import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";
import BrandSymbol from "./BrandSymbol";

export default function SoldierHeader({ currentDay, remainingCount = 0, totalCount = 0 }) {
  return (
    <View style={styles.header}>
      <View style={styles.topline}>
        <Text style={styles.kicker}>MODO SOLDADO</Text>
        <BrandSymbol muted size={34} />
        <Text style={styles.count}>{remainingCount} RESTAM</Text>
      </View>
      <Text style={styles.title}>LEÃO DO DIA</Text>
      <Text style={styles.subtitle}>{currentDay}</Text>
      <View style={styles.rule} />
      <Text style={styles.directive}>
        {totalCount === 1
          ? "1 ordem para matar o leão. Execute."
          : `${totalCount} ordens para matar o leão. Execute.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    paddingBottom: theme.spacing.lg,
  },
  topline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  kicker: {
    ...theme.typography.small,
    color: theme.colors.red,
  },
  count: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    fontSize: 34,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    textTransform: "uppercase",
  },
  rule: {
    backgroundColor: theme.colors.red,
    height: 2,
    marginTop: theme.spacing.md,
    width: 82,
  },
  directive: {
    ...theme.typography.small,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
});
