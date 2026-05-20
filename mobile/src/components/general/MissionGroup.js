import React from "react";
import { StyleSheet, Text, View } from "react-native";

import MissionCard from "../MissionCard";
import { bunkerTheme as theme } from "../../theme/bunkermodeTheme";

export default function MissionGroup({
  label,
  missions,
  completingId,
  justifyingId,
  onComplete,
  onDelete,
  onEdit,
  onJustify,
  onTogglePin,
  togglingId,
  tone = "",
}) {
  if (!missions.length) {
    return null;
  }

  return (
    <View style={styles.missionGroup}>
      <View style={styles.missionGroupHeader}>
        <Text
          style={[
            styles.missionGroupLabel,
            tone === "critical" && styles.missionGroupCritical,
            tone === "danger" && styles.missionGroupDanger,
            tone === "completed" && styles.missionGroupCompleted,
          ]}
        >
          {label}
        </Text>
        <Text style={styles.missionGroupCount}>{missions.length}</Text>
      </View>
      <View style={[styles.missionList, tone === "completed" && styles.completedMissionList]}>
        {missions.map((mission, index) => (
          <MissionCard
            key={String(mission?.id ?? index)}
            completing={completingId === mission?.id}
            justifying={justifyingId === mission?.id}
            mission={mission}
            onComplete={() => onComplete?.(mission)}
            onDelete={onDelete}
            onEdit={onEdit}
            onJustify={(payload) => onJustify?.(mission, payload)}
            onTogglePin={onTogglePin}
            toggling={togglingId === mission?.id}
            variant="general"
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  missionGroup: {
    gap: theme.spacing.sm,
  },
  missionGroupHeader: {
    alignItems: "center",
    borderBottomColor: theme.colors.borderSoft,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: theme.spacing.xs,
  },
  missionGroupLabel: {
    ...theme.typography.small,
    color: theme.colors.textDim,
  },
  missionGroupCritical: {
    color: theme.colors.neonPurple,
  },
  missionGroupDanger: {
    color: theme.colors.red,
  },
  missionGroupCompleted: {
    color: theme.colors.success,
  },
  missionGroupCount: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  missionList: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  completedMissionList: {
    marginTop: 0,
    opacity: 0.82,
  },
});
