import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import { formatDisplayDate } from "../utils/dates";
import { colors, layout, radius, spacing, surfaces, typography } from "../styles/tokens";
import StatusNotice from "./StatusNotice";

function getErrorMessage(result, fallback) {
  return result?.data?.detail || fallback;
}

const failureReasonLabels = {
  not_done: "Nao fez",
  done_not_marked: "Fez, mas nao registrou",
  partially_done: "Fez parcialmente",
  external_blocker: "Imprevisto real",
  other: "Outro motivo",
};

export default function ReviewCard({ mission, token, onReload, onLogout }) {
  const [loadingAction, setLoadingAction] = useState("");
  const [error, setError] = useState("");

  async function review(accepted) {
    setLoadingAction(accepted ? "accept" : "reject");
    setError("");
    const result = await api.submitGeneralReview(token, mission?.id, { accepted });
    setLoadingAction("");

    if (result.status === 401) {
      if (onLogout) {
        onLogout();
      } else {
        setError("Sessao expirada.");
      }
      return;
    }

    if (!result.ok) {
      setError(getErrorMessage(result, "Nao foi possivel revisar a falha."));
      return;
    }

    onReload();
  }

  const failedAt = mission?.failed_at ? ` · Falhou em: ${formatDisplayDate(mission.failed_at)}` : "";
  const reasonTypeLabel =
    failureReasonLabels[mission?.failure_reason_type] || "Tipo nao informado";

  return (
    <View style={styles.card}>
      <Text style={styles.label}>AGUARDANDO REVISAO</Text>
      <Text style={styles.title}>{mission?.titulo || "Sem titulo"}</Text>
      <Text style={styles.meta}>Prazo: {mission?.prazo || "Sem prazo"}{failedAt}</Text>

      <View style={styles.justification}>
        <Text style={styles.justificationLabel}>JUSTIFICATIVA DO SOLDADO</Text>
        <Text style={styles.reasonType}>{reasonTypeLabel}</Text>
        <Text style={styles.reason}>{mission?.failure_reason || "Justificativa nao registrada"}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          disabled={Boolean(loadingAction)}
          onPress={() => review(true)}
          style={[styles.action, styles.accept]}
        >
          {loadingAction === "accept" ? (
            <ActivityIndicator color={colors.green} />
          ) : (
            <Text style={[styles.actionText, styles.acceptText]}>ACEITAR</Text>
          )}
        </Pressable>
        <Pressable
          disabled={Boolean(loadingAction)}
          onPress={() => review(false)}
          style={[styles.action, styles.reject]}
        >
          {loadingAction === "reject" ? (
            <ActivityIndicator color={colors.red} />
          ) : (
            <Text style={[styles.actionText, styles.rejectText]}>REJEITAR</Text>
          )}
        </Pressable>
      </View>

      <StatusNotice type="error" message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: surfaces.amberBg,
    borderColor: colors.amber,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm + spacing.xs,
    padding: spacing.cardPad,
  },
  label: {
    ...typography.small,
    color: colors.amber,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    marginTop: 6,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  justification: {
    borderTopColor: colors.borderSubtle,
    borderTopWidth: 1,
    marginTop: spacing.sm + spacing.xs,
    paddingTop: spacing.sm + spacing.xs,
  },
  justificationLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  reason: {
    color: colors.textPrimary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  reasonType: {
    color: colors.amber,
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  action: {
    flex: 1,
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    height: layout.actionButtonHeight,
    justifyContent: "center",
  },
  accept: {
    backgroundColor: surfaces.greenBg,
    borderColor: colors.green,
  },
  reject: {
    backgroundColor: surfaces.redBg,
    borderColor: colors.red,
  },
  actionText: {
    ...typography.label,
    fontWeight: "700",
  },
  acceptText: {
    color: colors.green,
  },
  rejectText: {
    color: colors.red,
  },
});
