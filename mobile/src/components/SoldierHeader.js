import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";
import LionEmblem from "./LionEmblem";

export default function SoldierHeader({ currentDay, remainingCount = 0, totalCount = 0 }) {
  return (
    <View style={styles.header}>
      <View style={styles.topline}>
        <Text style={styles.kicker}>FOCO OPERACIONAL</Text>
        <Text style={styles.count}>{remainingCount} RESTAM</Text>
      </View>
      <View style={styles.briefing}>
        <LionEmblem compact />
        <View style={styles.copy}>
          <Text style={styles.title}>LEÃO DO DIA</Text>
          <Text style={styles.subtitle}>{currentDay}</Text>
          <View style={styles.rule} />
          <Text style={styles.focusNote}>Interface reduzida para manter ritmo e ação.</Text>
          <Text style={styles.directive}>
            {remainingCount === 0
              ? "Execução do dia concluída."
              : remainingCount === 1
                ? "1 ordem restante em execução."
                : `${remainingCount} ordens restantes em execução.`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "rgba(11,11,11,0.58)",
    borderColor: "rgba(255,138,42,0.20)",
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  topline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  kicker: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  count: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    fontSize: 30,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    textTransform: "uppercase",
  },
  rule: {
    backgroundColor: theme.colors.fire,
    height: 2,
    marginTop: theme.spacing.md,
    width: 82,
  },
  directive: {
    ...theme.typography.small,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  focusNote: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    marginTop: theme.spacing.sm,
  },
  briefing: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
});
