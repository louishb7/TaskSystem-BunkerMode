import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, spacing, surfaces, typography } from "../styles/tokens";
import { generalTheme } from "../styles/generalTheme";
import Badge from "./Badge";
import DeadlineTag from "./DeadlineTag";
import PriorityBar from "./PriorityBar";

const commandColors = generalTheme.colors;

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
  tone = "default",
  togglingId,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingToggle, setConfirmingToggle] = useState(false);
  const disabled = togglingId === mission?.id;
  const permissionsAvailable = hasPermissions(mission);
  const isDecided = mission?.is_decided === true;
  const statusLabel = mission?.status_label || mission?.status_code || "";
  const command = tone === "command";

  useEffect(() => {
    setConfirmingToggle(false);
  }, [mission?.is_decided, mission?.id]);

  return (
    <View
      style={[
        styles.card,
        command && styles.commandCard,
        isDecided && styles.decidedCard,
        command && isDecided && styles.commandDecidedCard,
      ]}
    >
      {command ? <View style={[styles.orderRail, isDecided && styles.orderRailDecided]} /> : null}
      <View style={styles.metaRow}>
        <PriorityBar priority={mission?.prioridade} tone={tone} />
        <DeadlineTag dueDate={mission?.prazo ?? null} tone={tone} />
      </View>

      <Text style={[styles.title, command && styles.commandTitle]}>{mission?.titulo || "Sem título"}</Text>

      {mission?.instrucao ? (
        <Text numberOfLines={3} style={[styles.instruction, command && styles.commandInstruction]}>
          {mission.instrucao}
        </Text>
      ) : null}

      <View style={styles.badgeRow}>
        {isDecided ? <Badge type="decided" tone={tone} /> : null}
        <View style={[styles.statusBadge, command && styles.commandStatusBadge]}>
          <Text style={[styles.statusBadgeText, command && styles.commandStatusBadgeText]}>{statusLabel}</Text>
        </View>
      </View>

      {permissionsAvailable ? (
        <View style={[styles.actions, command && styles.commandActions]}>
          {can(mission, "can_toggle_decided") ? (
            confirmingToggle ? (
              <View style={styles.confirmRow}>
                <Pressable
                  disabled={disabled}
                  onPress={() => {
                    setConfirmingToggle(false);
                    onToggleDecision(mission);
                  }}
                  style={[styles.actionButton, styles.decidedButton, command && styles.commandDecidedButton]}
                >
                  {disabled ? (
                    <ActivityIndicator color={command ? commandColors.accentDark : colors.red} />
                  ) : (
                    <Text style={[styles.actionText, styles.decidedText, command && styles.commandDecidedText]}>
                      CONFIRMAR REMOÇÃO
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  disabled={disabled}
                  onPress={() => setConfirmingToggle(false)}
                  style={[styles.actionButton, styles.secondaryButton, command && styles.commandSecondaryButton]}
                >
                  <Text style={[styles.actionText, styles.secondaryText, command && styles.commandSecondaryText]}>CANCELAR</Text>
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
                style={[
                  styles.actionButton,
                  isDecided ? styles.decidedButton : styles.secondaryButton,
                  command && isDecided && styles.commandDecidedButton,
                  command && !isDecided && styles.commandSecondaryButton,
                ]}
              >
                  {disabled ? (
                    <ActivityIndicator color={command ? commandColors.accentDark : colors.red} />
                  ) : (
                  <Text
                    style={[
                      styles.actionText,
                      isDecided ? styles.decidedText : styles.secondaryText,
                      command && isDecided && styles.commandDecidedText,
                      command && !isDecided && styles.commandSecondaryText,
                    ]}
                  >
                    {isDecided ? "REMOVER DECIDIDA" : "MARCAR DECIDIDA"}
                  </Text>
                )}
              </Pressable>
            )
          ) : null}

          {can(mission, "can_edit") ? (
            <Pressable
              disabled={disabled}
              onPress={() => onEdit(mission)}
              style={[styles.actionButton, styles.secondaryButton, command && styles.commandSecondaryButton]}
            >
              <Text style={[styles.actionText, styles.secondaryText, command && styles.commandSecondaryText]}>EDITAR</Text>
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
                <Text style={[styles.actionText, styles.confirmRemoveText]}>CONFIRMAR REMOÇÃO</Text>
              </Pressable>
              <Pressable
                disabled={disabled}
                onPress={() => setConfirmingDelete(false)}
                style={[styles.actionButton, styles.secondaryButton, command && styles.commandSecondaryButton]}
              >
                <Text style={[styles.actionText, styles.secondaryText, command && styles.commandSecondaryText]}>CANCELAR</Text>
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
  commandCard: {
    backgroundColor: commandColors.panelSoft,
    borderColor: commandColors.border,
    borderRadius: radius.md,
    marginBottom: 0,
    overflow: "hidden",
    paddingLeft: spacing.md + spacing.xs,
  },
  commandDecidedCard: {
    backgroundColor: commandColors.decisionSurface,
    borderColor: commandColors.decisionBorder,
    borderLeftColor: commandColors.decisionBorder,
    borderLeftWidth: 1,
  },
  orderRail: {
    backgroundColor: commandColors.route,
    bottom: spacing.md,
    left: 0,
    opacity: 0.72,
    position: "absolute",
    top: spacing.md,
    width: 3,
  },
  orderRailDecided: {
    backgroundColor: commandColors.decision,
    opacity: 0.86,
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
  commandTitle: {
    color: commandColors.ink,
    fontSize: 18,
  },
  instruction: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  commandInstruction: {
    color: commandColors.muted,
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
  commandStatusBadge: {
    backgroundColor: commandColors.panelMutedSoft,
    borderColor: commandColors.border,
  },
  commandStatusBadgeText: {
    color: commandColors.muted,
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
  commandActions: {
    borderTopColor: commandColors.border,
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
  commandSecondaryButton: {
    borderColor: commandColors.borderStrong,
  },
  secondaryText: {
    color: colors.textSecondary,
  },
  commandSecondaryText: {
    color: commandColors.accentDark,
  },
  decidedButton: {
    backgroundColor: surfaces.amberBg,
    borderColor: colors.red,
  },
  commandDecidedButton: {
    backgroundColor: commandColors.decisionWash,
    borderColor: commandColors.decisionBorder,
  },
  decidedText: {
    color: colors.red,
  },
  commandDecidedText: {
    color: commandColors.decisionText,
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
