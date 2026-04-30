import React from "react";
import { StyleSheet, Text, View } from "react-native";

import EmptyState from "../EmptyState";
import GeneralMissionCard from "../GeneralMissionCard";
import { generalTheme } from "../../styles/generalTheme";
import { spacing, typography } from "../../styles/tokens";

const commandColors = generalTheme.colors;

export default function OperationalOrdersBoard({
  missions,
  onDelete,
  onEdit,
  onToggleDecision,
  togglingId,
}) {
  const hasMissions = missions.length > 0;
  const countLabel = hasMissions
    ? `${missions.length} ${missions.length === 1 ? "ordem" : "ordens"}`
    : "sem ordens";

  return (
    <View style={styles.board}>
      <Text style={styles.count}>{countLabel}</Text>

      {hasMissions ? (
        <View style={styles.list}>
          {missions.map((mission, index) => (
            <GeneralMissionCard
              key={String(mission?.id ?? index)}
              mission={mission}
              onDelete={onDelete}
              onEdit={onEdit}
              onToggleDecision={onToggleDecision}
              tone="command"
              togglingId={togglingId}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <EmptyState tone="command" message="Nenhuma ordem definida para o dia selecionado." />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    marginTop: spacing.lg,
  },
  count: {
    ...typography.small,
    color: commandColors.accentDark,
    fontWeight: "900",
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  emptyWrap: {
    borderColor: commandColors.border,
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
});
