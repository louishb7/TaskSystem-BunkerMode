import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, layout, radius, spacing, typography } from "../styles/tokens";
import StatusNotice from "./StatusNotice";

export default function ActionArea({ mission, onComplete, onJustify }) {
  const [justification, setJustification] = useState("");
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
    const result = await onJustify(mission.id, justification.trim());
    setJustifyLoading(false);

    if (!result?.ok) {
      setError(result?.error || "Nao foi possivel enviar a justificativa.");
      return;
    }

    setJustification("");
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
