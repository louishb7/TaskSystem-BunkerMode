import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, layout, radius, spacing, typography } from "../styles/tokens";
import StatusNotice from "./StatusNotice";

const failureReasonTypes = [
  { value: "not_done", label: "Nao fiz" },
  { value: "done_not_marked", label: "Fiz, mas esqueci de marcar" },
  { value: "partially_done", label: "Fiz parcialmente" },
  { value: "external_blocker", label: "Imprevisto real" },
  { value: "other", label: "Outro motivo" },
];

export default function ActionArea({ mission, onComplete, onJustify }) {
  const [justification, setJustification] = useState("");
  const [failureReasonType, setFailureReasonType] = useState("not_done");
  const [completeLoading, setCompleteLoading] = useState(false);
  const [justifyLoading, setJustifyLoading] = useState(false);
  const [error, setError] = useState("");
  const permissions = mission?.permissions || {};
  const canComplete = Boolean(permissions.can_complete);
  const canJustify = Boolean(permissions.can_justify);

  if (!canComplete && !canJustify) {
    return null;
  }

  async function handleComplete() {
    setError("");
    setCompleteLoading(true);
    const result = await onComplete(mission.id);
    setCompleteLoading(false);

    if (!result?.ok) {
      setError(result?.error || "Nao foi possivel concluir a missao.");
    }
  }

  async function handleJustify() {
    setError("");
    setJustifyLoading(true);
    const result = await onJustify(mission.id, {
      failure_reason_type: failureReasonType,
      failure_reason: justification.trim(),
    });
    setJustifyLoading(false);

    if (!result?.ok) {
      setError(result?.error || "Nao foi possivel enviar a justificativa.");
      return;
    }

    setJustification("");
    setFailureReasonType("not_done");
  }

  return (
    <View style={styles.container}>
      {canComplete ? (
        <Pressable
          disabled={completeLoading}
          onPress={handleComplete}
          style={({ pressed }) => [
            styles.completeButton,
            (pressed || completeLoading) && styles.pressed,
          ]}
        >
          {completeLoading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text style={styles.completeText}>CONCLUIR MISSAO</Text>
          )}
        </Pressable>
      ) : null}

      {canJustify ? (
        <View style={styles.justifyBlock}>
          <Text style={styles.justifyLabel}>JUSTIFICATIVA OBRIGATORIA</Text>
          <View style={styles.reasonTypeGrid}>
            {failureReasonTypes.map((option) => {
              const selected = option.value === failureReasonType;
              return (
                <Pressable
                  disabled={justifyLoading}
                  key={option.value}
                  onPress={() => setFailureReasonType(option.value)}
                  style={[styles.reasonTypeButton, selected && styles.reasonTypeSelected]}
                >
                  <Text
                    style={[
                      styles.reasonTypeText,
                      selected && styles.reasonTypeTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            multiline
            onChangeText={setJustification}
            placeholder="O que aconteceu?"
            placeholderTextColor={colors.textMuted}
            style={styles.justifyInput}
            value={justification}
          />
          <Pressable
            disabled={justifyLoading}
            onPress={handleJustify}
            style={({ pressed }) => [
              styles.justifyButton,
              (pressed || justifyLoading) && styles.pressed,
            ]}
          >
            {justifyLoading ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={styles.justifyText}>ENVIAR JUSTIFICATIVA</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      <StatusNotice type="error" message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopColor: colors.borderSubtle,
    borderTopWidth: 1,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  completeButton: {
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: radius.md,
    height: layout.actionButtonHeight,
    justifyContent: "center",
    width: layout.fullWidth,
  },
  completeText: {
    ...typography.label,
    color: colors.bg,
    fontWeight: "700",
  },
  justifyBlock: {
    marginTop: spacing.sm,
  },
  justifyLabel: {
    ...typography.small,
    color: colors.amber,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  reasonTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  reasonTypeButton: {
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  reasonTypeSelected: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  reasonTypeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  reasonTypeTextSelected: {
    color: colors.bg,
  },
  justifyInput: {
    backgroundColor: colors.bg,
    borderColor: colors.amber,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    ...typography.missionInstruction,
    minHeight: layout.justificationInputMinHeight,
    padding: spacing.sm + spacing.xs,
    textAlignVertical: "top",
  },
  justifyButton: {
    alignItems: "center",
    backgroundColor: colors.amber,
    borderRadius: radius.md,
    height: layout.actionButtonHeight,
    justifyContent: "center",
    marginTop: spacing.sm,
    width: layout.fullWidth,
  },
  justifyText: {
    ...typography.label,
    color: colors.bg,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
});
