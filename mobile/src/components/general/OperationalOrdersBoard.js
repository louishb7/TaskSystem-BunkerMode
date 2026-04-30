import React from "react";
import { StyleSheet, Text, View } from "react-native";

import EmptyState from "../EmptyState";
import GeneralMissionCard from "../GeneralMissionCard";
import { generalTheme } from "../../styles/generalTheme";
import { spacing, typography } from "../../styles/tokens";

const commandColors = generalTheme.colors;

export default function OperationalOrdersBoard({
  dateLabel,
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
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>ORDENS DO DIA</Text>
          <Text style={styles.title}>{dateLabel}</Text>
        </View>
        <Text style={styles.count}>{countLabel}</Text>
      </View>

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
          <EmptyState tone="command" message={`Nenhuma ordem definida para ${dateLabel}.`} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    marginTop: spacing.lg,
  },
  header: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  kicker: {
    ...typography.small,
    color: commandColors.muted,
    fontWeight: "800",
  },
  title: {
    color: commandColors.ink,
    fontSize: 20,
    fontWeight: "900",
    marginTop: spacing.xs,
  },
  count: {
    ...typography.small,
    color: commandColors.accentDark,
    fontWeight: "900",
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
