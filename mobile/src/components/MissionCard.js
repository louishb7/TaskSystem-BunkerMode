import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { isCompleted } from "../utils/missionStatus";
import { bunkerTheme as theme } from "../theme/bunkermodeTheme";
import ProgressStrip from "./ProgressStrip";

const failureReasonTypes = [
  { value: "not_done", label: "NÃO FIZ" },
  { value: "done_not_marked", label: "FIZ, NÃO REGISTREI" },
  { value: "partially_done", label: "FIZ PARCIAL" },
  { value: "external_blocker", label: "IMPEDIMENTO REAL" },
  { value: "other", label: "OUTRO" },
];

function hasPermissions(mission) {
  return mission?.permissions && typeof mission.permissions === "object";
}

function can(mission, key) {
  return mission?.id !== undefined
    && mission?.id !== null
    && hasPermissions(mission)
    && mission.permissions[key] === true;
}

function parseMissionDate(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dayRaw, monthRaw, yearRaw] = value.split("-");
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = Number(yearRaw);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getDate() === day
      && parsed.getMonth() === month - 1
      && parsed.getFullYear() === year
    ) {
      return parsed;
    }
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [yearRaw, monthRaw, dayRaw] = value.slice(0, 10).split("-");
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = Number(yearRaw);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getDate() === day
      && parsed.getMonth() === month - 1
      && parsed.getFullYear() === year
    ) {
      return parsed;
    }
  }

  return null;
}

function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDeadline(value) {
  const parsed = parseMissionDate(value);
  if (!parsed) {
    return "SEM DATA";
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");

  if (parsed.getTime() === todayStart().getTime()) {
    return "HOJE";
  }

  if (parsed.getTime() < todayStart().getTime()) {
    return "ATRASADA";
  }

  return `${day}/${month}`;
}

function priorityLabel(priority) {
  if (Number(priority) === 1) {
    return "CRÍTICA";
  }
  if (Number(priority) === 2) {
    return "IMPORTANTE";
  }
  if (Number(priority) === 3) {
    return "PADRÃO";
  }
  return "SEM PRIORIDADE";
}

function statusText(mission) {
  if (mission?.status_label) {
    return mission.status_label;
  }

  const fallback = {
    PENDENTE: "Pendente",
    CONCLUIDA: "Concluída",
    FALHA_PENDENTE_JUSTIFICATIVA: "Falha aguardando justificativa",
    FALHA_JUSTIFICADA_PENDENTE_REVISAO: "Falha aguardando revisão",
    FALHA_REVISADA: "Falha revisada",
  };

  return fallback[mission?.status_code] || "Pendente";
}

export default function MissionCard({
  completing = false,
  justifying = false,
  mission,
  onComplete,
  onDelete,
  onEdit,
  onJustify,
  onToggleDecision,
  toggling = false,
  variant = "general",
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingToggle, setConfirmingToggle] = useState(false);
  const [failureReasonType, setFailureReasonType] = useState("not_done");
  const [failureReason, setFailureReason] = useState("");
  const soldier = variant === "soldier";
  const title = mission?.titulo || "Sem título";
  const instruction = mission?.instrucao || "";
  const statusLabel = statusText(mission);
  const isDecided = mission?.is_decided === true;
  const canComplete = can(mission, "can_complete");
  const canJustify = can(mission, "can_justify");
  const disabled = toggling || completing || justifying;

  useEffect(() => {
    setConfirmingToggle(false);
    setConfirmingDelete(false);
  }, [mission?.id, mission?.is_decided]);

  function submitJustification() {
    const trimmed = failureReason.trim();
    if (!trimmed) {
      return;
    }

    onJustify?.({
      failure_reason_type: failureReasonType,
      failure_reason: trimmed,
    });
  }

  if (soldier) {
    return (
      <View style={[styles.card, styles.soldierCard, canJustify && styles.dangerCard]}>
        <View style={styles.cardTop}>
          <View style={styles.orderCode}>
            <Text style={styles.orderCodeText}>ORDEM</Text>
          </View>
          <Text numberOfLines={1} style={styles.status}>{statusLabel}</Text>
        </View>

        <Text numberOfLines={2} style={styles.soldierTitle}>{title}</Text>
        {instruction ? (
          <Text numberOfLines={4} style={styles.instruction}>{instruction}</Text>
        ) : null}

        {canJustify ? (
          <View style={styles.justification}>
            <Text style={styles.dangerLabel}>JUSTIFICATIVA OBRIGATÓRIA</Text>
            <View style={styles.reasonGrid}>
              {failureReasonTypes.map((option) => {
                const selected = option.value === failureReasonType;
                return (
                  <Pressable
                    disabled={justifying}
                    key={option.value}
                    onPress={() => setFailureReasonType(option.value)}
                    style={[styles.reasonButton, selected && styles.reasonButtonSelected]}
                  >
                    <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              multiline
              onChangeText={setFailureReason}
              placeholder="REGISTRE O MOTIVO"
              placeholderTextColor={theme.colors.textDim}
              style={styles.justificationInput}
              value={failureReason}
            />
            <Pressable
              disabled={justifying || !failureReason.trim()}
              onPress={submitJustification}
              style={[
                styles.primaryAction,
                styles.justifyAction,
                (!failureReason.trim() || justifying) && styles.disabled,
              ]}
            >
              {justifying ? (
                <ActivityIndicator color={theme.colors.black} />
              ) : (
                <Text style={styles.primaryActionText}>REGISTRAR JUSTIFICATIVA</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {canComplete ? (
          <Pressable
            disabled={completing}
            onPress={onComplete}
            style={[styles.primaryAction, completing && styles.disabled]}
          >
            {completing ? (
              <ActivityIndicator color={theme.colors.black} />
            ) : (
              <Text style={styles.primaryActionText}>CONCLUIR ORDEM</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.card, isDecided && styles.decidedCard]}>
      <View style={styles.cardTop}>
        <View style={styles.metaCluster}>
          <Text style={[styles.metaTag, Number(mission?.prioridade) === 1 && styles.metaTagHot]}>
            {priorityLabel(mission?.prioridade)}
          </Text>
          <Text style={styles.metaTag}>{formatDeadline(mission?.prazo)}</Text>
        </View>
        <Text numberOfLines={1} style={styles.status}>{statusLabel}</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      {instruction ? (
        <Text numberOfLines={3} style={styles.instruction}>{instruction}</Text>
      ) : null}

      <View style={styles.statusRow}>
        <Text style={[styles.decision, isDecided && styles.decisionActive]}>
          {isDecided ? "COMPROMETIDA" : "RASCUNHO"}
        </Text>
        {isCompleted(mission) ? <Text style={styles.done}>CONCLUÍDA</Text> : null}
      </View>

      <View style={styles.actions}>
        {can(mission, "can_toggle_decided") ? (
          confirmingToggle ? (
            <View style={styles.confirmRow}>
              <Pressable
                disabled={disabled}
                onPress={() => {
                  setConfirmingToggle(false);
                  onToggleDecision?.(mission);
                }}
                style={[styles.secondaryAction, styles.dangerAction]}
              >
                {toggling ? (
                  <ActivityIndicator color={theme.colors.red} />
                ) : (
                  <Text style={styles.dangerActionText}>CONFIRMAR</Text>
                )}
              </Pressable>
              <Pressable
                disabled={disabled}
                onPress={() => setConfirmingToggle(false)}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionText}>CANCELAR</Text>
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
                onToggleDecision?.(mission);
              }}
              style={[styles.secondaryAction, isDecided && styles.committedAction]}
            >
              {toggling ? (
                <ActivityIndicator color={theme.colors.red} />
              ) : (
                <Text style={[styles.secondaryActionText, isDecided && styles.committedActionText]}>
                  {isDecided ? "RETIRAR COMPROMISSO" : "COMPROMETER"}
                </Text>
              )}
            </Pressable>
          )
        ) : null}

        {can(mission, "can_edit") ? (
          <Pressable disabled={disabled} onPress={() => onEdit?.(mission)} style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>EDITAR</Text>
          </Pressable>
        ) : null}

        {can(mission, "can_delete") && !confirmingDelete ? (
          <Pressable disabled={disabled} onPress={() => setConfirmingDelete(true)} style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>REMOVER</Text>
          </Pressable>
        ) : null}

        {can(mission, "can_delete") && confirmingDelete ? (
          <View style={styles.confirmRow}>
            <Pressable
              disabled={disabled}
              onPress={() => onDelete?.(mission.id)}
              style={[styles.secondaryAction, styles.dangerAction]}
            >
              <Text style={styles.dangerActionText}>CONFIRMAR REMOÇÃO</Text>
            </Pressable>
            <Pressable
              disabled={disabled}
              onPress={() => setConfirmingDelete(false)}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryActionText}>CANCELAR</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function MissionProgress({ missions }) {
  const completed = missions.filter(isCompleted).length;
  return <ProgressStrip completed={completed} total={missions.length} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(37,42,42,0.82)",
    borderColor: "rgba(245,240,232,0.16)",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    minHeight: theme.layout.missionMinHeight,
    overflow: "hidden",
    padding: theme.spacing.md,
  },
  soldierCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderLeftColor: theme.colors.red,
    borderLeftWidth: 2,
  },
  dangerCard: {
    borderColor: theme.colors.red,
  },
  decidedCard: {
    borderColor: "rgba(182,138,58,0.5)",
    borderLeftColor: theme.colors.red,
    borderLeftWidth: 3,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderCode: {
    borderColor: theme.colors.red,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  orderCodeText: {
    ...theme.typography.small,
    color: theme.colors.red,
  },
  status: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    flexShrink: 1,
    marginLeft: theme.spacing.sm,
    textAlign: "right",
  },
  soldierTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
    fontSize: 22,
    marginTop: theme.spacing.md,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.white,
    fontSize: 18,
    marginTop: theme.spacing.sm,
  },
  instruction: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  metaCluster: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    maxWidth: "68%",
  },
  metaTag: {
    ...theme.typography.small,
    backgroundColor: "rgba(18,15,12,0.42)",
    borderColor: "rgba(245,240,232,0.16)",
    borderWidth: 1,
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  metaTagHot: {
    borderColor: theme.colors.red,
    color: theme.colors.red,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  decision: {
    ...theme.typography.small,
    backgroundColor: "rgba(18,15,12,0.3)",
    borderColor: "rgba(245,240,232,0.14)",
    borderWidth: 1,
    color: theme.colors.textDim,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  decisionActive: {
    borderColor: theme.colors.red,
    color: theme.colors.red,
  },
  done: {
    ...theme.typography.small,
    color: theme.colors.text,
  },
  actions: {
    borderTopColor: "rgba(245,240,232,0.12)",
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: theme.colors.red,
    borderColor: theme.colors.red,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: theme.spacing.md,
    minHeight: theme.layout.actionHeight,
    paddingHorizontal: theme.spacing.md,
  },
  justifyAction: {
    marginTop: theme.spacing.sm,
  },
  primaryActionText: {
    ...theme.typography.label,
    color: theme.colors.black,
    fontSize: 14,
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: theme.colors.transparent,
    borderColor: "rgba(245,240,232,0.18)",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  secondaryActionText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  committedAction: {
    backgroundColor: theme.colors.redWash,
    borderColor: theme.colors.red,
  },
  committedActionText: {
    color: theme.colors.red,
  },
  dangerAction: {
    backgroundColor: theme.colors.redWash,
    borderColor: theme.colors.red,
  },
  dangerActionText: {
    ...theme.typography.small,
    color: theme.colors.red,
  },
  confirmRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  disabled: {
    opacity: 0.45,
  },
  justification: {
    borderTopColor: "rgba(245,240,232,0.12)",
    borderTopWidth: 1,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  dangerLabel: {
    ...theme.typography.small,
    color: theme.colors.red,
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  reasonButton: {
    borderColor: theme.colors.borderStrong,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  reasonButtonSelected: {
    backgroundColor: theme.colors.red,
    borderColor: theme.colors.red,
  },
  reasonText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  reasonTextSelected: {
    color: theme.colors.black,
  },
  justificationInput: {
    ...theme.typography.body,
    borderColor: theme.colors.red,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    minHeight: theme.layout.inputMinHeight,
    padding: theme.spacing.md,
    textAlignVertical: "top",
  },
});
