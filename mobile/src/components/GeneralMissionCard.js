import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, spacing, surfaces, typography } from "../styles/tokens";
import Badge from "./Badge";
import DeadlineTag from "./DeadlineTag";
import PriorityBar from "./PriorityBar";

function hasPermissions(mission) {
  return mission?.permissions && typeof mission.permissions === "object";
}

function can(mission, key) {
  return mission?.id !== undefined && mission?.id !== null && hasPermissions(mission) && mission.permissions[key] === true;
}

export default function GeneralMissionCard({
  mission,
  onEdit,
  onDelete,
  onToggleDecision,
  togglingId,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingToggle, setConfirmingToggle] = useState(false);
  const disabled = togglingId === mission?.id;
  const permissionsAvailable = hasPermissions(mission);
  const isDecided = mission?.is_decided === true;
  const statusLabel = mission?.status_label || mission?.status_code || "";

  return (
    <View style={[styles.card, isDecided && styles.decidedCard]}>
      <View style={styles.metaRow}>
        <PriorityBar priority={mission?.prioridade} />
        <DeadlineTag dueDate={mission?.prazo ?? null} />
      </View>

      <Text style={styles.title}>{mission?.titulo || "Sem titulo"}</Text>

      {mission?.instrucao ? (
        <Text numberOfLines={3} style={styles.instruction}>
          {mission.instrucao}
        </Text>
      ) : null}

      <View style={styles.badgeRow}>
        {isDecided ? <Badge type="decided" /> : null}
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{statusLabel}</Text>
        </View>
      </View>

      {permissionsAvailable ? (
        <View style={styles.actions}>
          {can(mission, "can_toggle_decided") ? (
            confirmingToggle ? (
              <View style={styles.confirmRow}>
                <Pressable
                  disabled={disabled}
                  onPress={() => onToggleDecision(mission)}
                  style={[styles.actionButton, styles.decidedButton]}
                >
                  {disabled ? (
                    <ActivityIndicator color={colors.red} />
                  ) : (
                    <Text style={[styles.actionText, styles.decidedText]}>Confirmar remocao</Text>
                  )}
                </Pressable>
                <Pressable
                  disabled={disabled}
                  onPress={() => setConfirmingToggle(false)}
                  style={[styles.actionButton, styles.secondaryButton]}
                >
                  <Text style={[styles.actionText, styles.secondaryText]}>Cancelar</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                disabled={disabled}
                onPress={() => {
                  if (isDecided) {
                    setConfirmingToggle(true);
                    return;
                  }
                  onToggleDecision(mission);
                }}
                style={[styles.actionButton, isDecided ? styles.decidedButton : styles.secondaryButton]}
              >
                {disabled ? (
                  <ActivityIndicator color={colors.red} />
                ) : (
                  <Text style={[styles.actionText, isDecided ? styles.decidedText : styles.secondaryText]}>
                    {isDecided ? "REMOVER DECIDIDO" : "MARCAR DECIDIDO"}
                  </Text>
                )}
              </Pressable>
            )
          ) : null}

          {can(mission, "can_edit") ? (
            <Pressable
              disabled={disabled}
              onPress={() => onEdit(mission)}
              style={[styles.actionButton, styles.secondaryButton]}
            >
              <Text style={[styles.actionText, styles.secondaryText]}>EDITAR</Text>
            </Pressable>
          ) : null}

          {can(mission, "can_delete") && !confirmingDelete ? (
            <Pressable
              disabled={disabled}
              onPress={() => setConfirmingDelete(true)}
              style={[styles.actionButton, styles.removeButton]}
            >
              <Text style={[styles.actionText, styles.removeText]}>REMOVER</Text>
            </Pressable>
          ) : null}

          {can(mission, "can_delete") && confirmingDelete ? (
            <View style={styles.confirmRow}>
              <Pressable
                disabled={disabled}
                onPress={() => onDelete(mission.id)}
                style={[styles.actionButton, styles.confirmRemoveButton]}
              >
                <Text style={[styles.actionText, styles.confirmRemoveText]}>Confirmar remocao</Text>
              </Pressable>
              <Pressable
                disabled={disabled}
                onPress={() => setConfirmingDelete(false)}
                style={[styles.actionButton, styles.secondaryButton]}
              >
                <Text style={[styles.actionText, styles.secondaryText]}>Cancelar</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm + spacing.xs,
    padding: spacing.cardPad,
  },
  decidedCard: {
    borderLeftColor: colors.red,
    borderLeftWidth: 3,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    marginTop: spacing.sm + spacing.xs / 2,
  },
  instruction: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm + spacing.xs / 2,
  },
  statusBadge: {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: layout.tagPadH,
    paddingVertical: layout.tagPadV,
  },
  statusBadgeText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  actions: {
    borderTopColor: colors.borderSubtle,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  secondaryButton: {
    backgroundColor: colors.transparent,
    borderColor: colors.borderStrong,
  },
  secondaryText: {
    color: colors.textSecondary,
  },
  decidedButton: {
    backgroundColor: surfaces.amberBg,
    borderColor: colors.red,
  },
  decidedText: {
    color: colors.red,
  },
  removeButton: {
    backgroundColor: surfaces.redBg,
    borderColor: colors.red,
  },
  removeText: {
    color: colors.red,
  },
  confirmRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  confirmRemoveButton: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  confirmRemoveText: {
    color: colors.black,
  },
  actionText: {
    ...typography.label,
    fontWeight: "700",
  },
});
