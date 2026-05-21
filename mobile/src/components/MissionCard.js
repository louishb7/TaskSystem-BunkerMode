import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { isCompleted, isDoneNotMarked } from "../utils/missionStatus";
import { bunkerTheme as theme } from "../theme/bunkermodeTheme";
import ProgressStrip from "./ProgressStrip";

const failureReasonTypes = [
  { value: "not_done", label: "NÃO FIZ" },
  { value: "done_not_marked", label: "FIZ, NÃO REGISTREI" },
  { value: "partially_done", label: "FIZ PARCIAL" },
  { value: "external_blocker", label: "IMPEDIMENTO REAL" },
  { value: "other", label: "OUTRO" },
];

const fallbackReasonByType = {
  not_done: "Não fiz.",
  done_not_marked: "Fiz fora do aplicativo, mas não registrei no prazo.",
  partially_done: "Fiz parcialmente.",
  external_blocker: "Houve impedimento real.",
  other: "Outro motivo informado pelas opções.",
};

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
    return `${day}/${month}`;
  }

  return `${day}/${month}`;
}

function statusText(mission) {
  if (isDoneNotMarked(mission)) {
    return "FORA DO APP";
  }

  const compact = {
    PENDENTE: "PENDENTE",
    CONCLUIDA: "CONCLUÍDA",
    FALHA_PENDENTE_JUSTIFICATIVA: "FALHOU",
    FALHA_JUSTIFICADA_PENDENTE_REVISAO: "FALHOU",
    FALHA_REVISADA: "FALHA REVISADA",
  };

  return compact[mission?.status_code] || mission?.status_label || "PENDENTE";
}

export default function MissionCard({
  completing = false,
  justifying = false,
  mission,
  onComplete,
  onDelete,
  onEdit,
  onInputFocus,
  onJustify,
  onTogglePin,
  toggling = false,
  variant = "general",
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [failureFormOpen, setFailureFormOpen] = useState(false);
  const [failureReasonType, setFailureReasonType] = useState("not_done");
  const [failureReason, setFailureReason] = useState("");
  const soldier = variant === "soldier";
  const title = mission?.titulo || "Sem título";
  const instruction = mission?.instrucao || "";
  const statusLabel = statusText(mission);
  const isPinned = mission?.is_pinned === true;
  const completed = isCompleted(mission);
  const operationName = mission?.operacao_nome;
  const canComplete = can(mission, "can_complete");
  const canJustify = can(mission, "can_fail");
  const requiresJustification = mission?.requires_immediate_justification === true;
  const disabled = toggling || completing || justifying;
  const failed = String(mission?.status_code || "").startsWith("FALHA");

  useEffect(() => {
    setConfirmingDelete(false);
    setFailureFormOpen(false);
  }, [mission?.id, mission?.is_pinned]);

  function submitJustification() {
    const trimmed = failureReason.trim();

    onJustify?.();
  }

  if (soldier) {
    return (
      <View
        style={[
          styles.card,
          styles.soldierCard,
          isPinned && styles.soldierPriorityCard,
          failed && styles.dangerCard,
        ]}
      >
        <View style={styles.soldierCardTop}>
          {isPinned ? (
            <View style={[styles.orderCode, styles.orderCodeCritical]}>
              <Text style={[styles.orderCodeText, styles.orderCodeCriticalText]}>
                INEGOCIÁVEL
              </Text>
            </View>
          ) : null}
          {operationName ? (
            <View style={[styles.orderCode, styles.orderCodeOperation]}>
              <Text style={[styles.orderCodeText, styles.orderCodeOperationText]}>OPERAÇÃO</Text>
            </View>
          ) : null}
          <Text numberOfLines={1} style={styles.status}>{statusLabel}</Text>
        </View>

        <Text numberOfLines={2} style={styles.soldierTitle}>{title}</Text>
        {operationName ? (
          <Text numberOfLines={1} style={styles.origin}>Operação: {operationName}</Text>
        ) : null}
        {instruction ? (
          <Text numberOfLines={4} style={styles.instruction}>{instruction}</Text>
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
              <Text style={styles.primaryActionText}>ABATER</Text>
            )}
          </Pressable>
        ) : null}

        {canJustify ? (
          <Pressable
            disabled={disabled}
            onPress={onJustify}
            style={styles.manualFailureAction}
          >
            <Text style={styles.manualFailureText}>REGISTRAR FALHA</Text>
          </Pressable>
        ) : null}

        {false && canJustify && (!canComplete || failureFormOpen) ? (
          <View style={styles.justification}>
            {canComplete ? (
              <Text style={styles.failureWarning}>
                A ordem será retirada do quadro do Soldado e registrada como falha no relatório.
              </Text>
            ) : null}
            <Text style={styles.dangerLabel}>
              {requiresJustification ? "JUSTIFICATIVA OBRIGATÓRIA" : "REGISTRO DA FALHA"}
            </Text>
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
              onFocus={onInputFocus}
              placeholder="REGISTRE O MOTIVO SE NECESSÁRIO"
              placeholderTextColor={theme.colors.textDim}
              style={styles.justificationInput}
              value={failureReason}
            />
            <Pressable
              disabled={justifying}
              onPress={submitJustification}
              style={[
                styles.primaryAction,
                styles.justifyAction,
                justifying && styles.disabled,
              ]}
            >
              {justifying ? (
                <ActivityIndicator color={theme.colors.black} />
              ) : (
                <Text style={styles.primaryActionText}>
                  {requiresJustification ? "REGISTRAR JUSTIFICATIVA" : "REGISTRAR FALHA"}
                </Text>
              )}
            </Pressable>
            {canComplete ? (
              <Pressable
                disabled={disabled}
                onPress={() => setFailureFormOpen(false)}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionText}>CANCELAR FALHA</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.card, isPinned && styles.priorityCard, completed && styles.completedCard]}>
      <View style={styles.badgeRow}>
        {isPinned ? (
          <Text style={[styles.metaTag, styles.metaTagCritical]}>INEGOCIÁVEL</Text>
        ) : null}
        {operationName ? <Text style={[styles.metaTag, styles.metaTagOperation]}>OPERAÇÃO</Text> : null}
        {formatDeadline(mission?.prazo) !== "HOJE" ? <Text style={styles.metaTag}>{formatDeadline(mission?.prazo)}</Text> : null}
        <Text style={styles.metaTag}>{statusLabel}</Text>
      </View>

      <Text numberOfLines={2} style={styles.title}>{title}</Text>
      {operationName ? (
        <Text numberOfLines={1} style={styles.origin}>Operação: {operationName}</Text>
      ) : null}
      {instruction ? (
        <Text numberOfLines={2} style={styles.instruction}>{instruction}</Text>
      ) : null}

      {completed ? (
        <View style={styles.statusRow}>
          <Text style={styles.done}>CONCLUÍDA</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          disabled={disabled}
          onPress={() => onTogglePin?.(mission)}
          style={[styles.secondaryAction, isPinned && styles.priorityAction]}
        >
          {toggling ? (
            <ActivityIndicator color={theme.colors.neonPurple} />
          ) : (
            <Text style={[styles.secondaryActionText, isPinned && styles.priorityActionText]}>
              {isPinned ? "REBAIXAR" : "INEGOCIÁVEL"}
            </Text>
          )}
        </Pressable>

        {canComplete ? (
          <Pressable
            disabled={completing}
            onPress={onComplete}
            style={styles.secondaryAction}
          >
            {completing ? (
              <ActivityIndicator color={theme.colors.textMuted} />
            ) : (
              <Text style={styles.secondaryActionText}>ABATER</Text>
            )}
          </Pressable>
        ) : null}

        {canJustify ? (
          <Pressable
            disabled={disabled}
            onPress={onJustify}
            style={[styles.secondaryAction, styles.dangerAction]}
          >
            <Text style={styles.dangerActionText}>REGISTRAR FALHA</Text>
          </Pressable>
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

      {false && canJustify && failureFormOpen ? (
        <View style={styles.justification}>
          <Text style={styles.failureWarning}>
            Registro administrativo de falha. Para uma sequência mais limpa, use o foco operacional.
          </Text>
          <Text style={styles.dangerLabel}>REGISTRO DA FALHA</Text>
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
            onFocus={onInputFocus}
            placeholder="REGISTRE O MOTIVO SE NECESSÁRIO"
            placeholderTextColor={theme.colors.textDim}
            style={styles.justificationInput}
            value={failureReason}
          />
          <Pressable
            disabled={justifying}
            onPress={submitJustification}
            style={[styles.primaryAction, styles.justifyAction, justifying && styles.disabled]}
          >
            {justifying ? (
              <ActivityIndicator color={theme.colors.black} />
            ) : (
              <Text style={styles.primaryActionText}>REGISTRAR FALHA</Text>
            )}
          </Pressable>
          <Pressable
            disabled={disabled}
            onPress={() => setFailureFormOpen(false)}
            style={styles.secondaryAction}
          >
            <Text style={styles.secondaryActionText}>CANCELAR FALHA</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function MissionProgress({ label = "PROGRESSO", missions }) {
  const completed = missions.filter(isCompleted).length;
  return <ProgressStrip completed={completed} label={label} total={missions.length} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(14,14,14,0.72)",
    borderColor: theme.colors.border,
    borderLeftColor: "rgba(237,237,237,0.16)",
    borderLeftWidth: 2,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    minHeight: theme.layout.missionMinHeight,
    overflow: "hidden",
    padding: theme.spacing.sm,
  },
  soldierCard: {
    backgroundColor: theme.colors.surface,
    borderLeftColor: theme.colors.fire,
    borderLeftWidth: 2,
  },
  soldierPriorityCard: {
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.purpleBorder,
    borderLeftColor: theme.colors.neonPurple,
  },
  dangerCard: {
    borderColor: theme.colors.red,
  },
  priorityCard: {
    backgroundColor: "rgba(23,23,23,0.95)",
    borderColor: theme.colors.purpleBorder,
    borderLeftColor: theme.colors.neonPurple,
    borderLeftWidth: 3,
  },
  completedCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.successBorder,
    borderLeftColor: theme.colors.success,
    borderLeftWidth: 3,
  },
  soldierCardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderCode: {
    borderColor: theme.colors.fireBorder,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  orderCodeCritical: {
    backgroundColor: theme.colors.purpleWash,
    borderColor: theme.colors.purpleBorder,
  },
  orderCodeText: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  orderCodeCriticalText: {
    color: theme.colors.neonPurple,
  },
  orderCodeOperation: {
    backgroundColor: "rgba(255,138,42,0.08)",
    borderColor: theme.colors.fireBorder,
  },
  orderCodeOperationText: {
    color: theme.colors.fire,
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
    fontSize: 15,
    marginTop: theme.spacing.xs,
  },
  instruction: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  origin: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    marginTop: theme.spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  metaTag: {
    ...theme.typography.small,
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.border,
    borderWidth: 1,
    color: theme.colors.textMuted,
    fontSize: 9,
    minHeight: 22,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  metaTagCritical: {
    backgroundColor: theme.colors.purpleDark,
    borderColor: theme.colors.purpleBorder,
    color: theme.colors.neonPurple,
  },
  metaTagOperation: {
    backgroundColor: "rgba(255,138,42,0.08)",
    borderColor: theme.colors.fireBorder,
    color: theme.colors.fire,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  done: {
    ...theme.typography.small,
    backgroundColor: theme.colors.successWash,
    borderColor: theme.colors.successBorder,
    borderWidth: 1,
    color: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  actions: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: theme.colors.fire,
    borderColor: theme.colors.fire,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: theme.spacing.sm,
    minHeight: theme.layout.actionHeight,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadow.fire,
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
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: theme.layout.compactActionHeight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  secondaryActionText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  manualFailureAction: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: theme.colors.redWash,
    borderColor: theme.colors.red,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: theme.spacing.sm,
    minHeight: 34,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  manualFailureText: {
    ...theme.typography.small,
    color: theme.colors.red,
    fontWeight: "900",
  },
  priorityAction: {
    backgroundColor: theme.colors.purpleWash,
    borderColor: theme.colors.purpleBorder,
  },
  priorityActionText: {
    color: theme.colors.neonPurple,
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
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  failureWarning: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
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
    backgroundColor: theme.colors.fire,
    borderColor: theme.colors.fire,
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
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    minHeight: theme.layout.inputMinHeight,
    padding: theme.spacing.md,
    textAlignVertical: "top",
  },
});
