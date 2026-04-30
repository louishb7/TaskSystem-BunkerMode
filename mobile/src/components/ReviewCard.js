import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import { formatDisplayDate } from "../utils/dates";
import { colors, layout, radius, spacing, surfaces, typography } from "../styles/tokens";
import { generalTheme } from "../styles/generalTheme";
import StatusNotice from "./StatusNotice";

const commandColors = generalTheme.colors;

function getErrorMessage(result, fallback) {
  return result?.data?.detail || fallback;
}

const failureReasonLabels = {
  not_done: "Não fez",
  done_not_marked: "Fez, mas não registrou",
  partially_done: "Fez parcialmente",
  external_blocker: "Imprevisto real",
  other: "Outro motivo",
};

export default function ReviewCard({ mission, token, onReload, onLogout, tone = "default" }) {
  const [loadingAction, setLoadingAction] = useState("");
  const [error, setError] = useState("");
  const command = tone === "command";

  async function review(accepted) {
    setLoadingAction(accepted ? "accept" : "reject");
    setError("");
    const result = await api.submitGeneralReview(token, mission?.id, { accepted });
    setLoadingAction("");

    if (result.status === 401) {
      if (onLogout) {
        onLogout();
      } else {
        setError("Sessão expirada.");
      }
      return;
    }

    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível revisar a falha."));
      return;
    }

    onReload();
  }

  const failedAt = mission?.failed_at ? ` · Falhou em: ${formatDisplayDate(mission.failed_at)}` : "";
  const reasonTypeLabel =
    failureReasonLabels[mission?.failure_reason_type] || "Tipo não informado";

  return (
    <View style={[styles.card, command && styles.commandCard]}>
      <Text style={[styles.label, command && styles.commandLabel]}>AGUARDANDO REVISÃO</Text>
      <Text style={[styles.title, command && styles.commandTitle]}>{mission?.titulo || "Sem título"}</Text>
      <Text style={[styles.meta, command && styles.commandMeta]}>Prazo: {mission?.prazo || "Sem prazo"}{failedAt}</Text>

      <View style={[styles.justification, command && styles.commandJustification]}>
        <Text style={[styles.justificationLabel, command && styles.commandJustificationLabel]}>JUSTIFICATIVA DO SOLDADO</Text>
        <Text style={[styles.reasonType, command && styles.commandReasonType]}>{reasonTypeLabel}</Text>
        <Text style={[styles.reason, command && styles.commandReason]}>{mission?.failure_reason || "Justificativa não registrada"}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          disabled={Boolean(loadingAction)}
          onPress={() => review(true)}
          style={[styles.action, styles.accept, command && styles.commandAccept]}
        >
          {loadingAction === "accept" ? (
            <ActivityIndicator color={command ? commandColors.white : colors.textPrimary} />
          ) : (
            <Text style={[styles.actionText, styles.acceptText, command && styles.commandAcceptText]}>ACEITAR</Text>
          )}
        </Pressable>
        <Pressable
          disabled={Boolean(loadingAction)}
          onPress={() => review(false)}
          style={[styles.action, styles.reject, command && styles.commandReject]}
        >
          {loadingAction === "reject" ? (
            <ActivityIndicator color={colors.red} />
          ) : (
            <Text style={[styles.actionText, styles.rejectText, command && styles.commandRejectText]}>REJEITAR</Text>
          )}
        </Pressable>
      </View>

      <StatusNotice type="error" message={error} tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: surfaces.amberBg,
    borderColor: colors.red,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm + spacing.xs,
    padding: spacing.cardPad,
  },
  commandCard: {
    backgroundColor: commandColors.alertBg,
    borderColor: commandColors.alert,
    padding: spacing.md,
  },
  label: {
    ...typography.small,
    color: colors.red,
  },
  commandLabel: {
    color: commandColors.alert,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    marginTop: 6,
  },
  commandTitle: {
    color: commandColors.ink,
    marginTop: spacing.xs,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  commandMeta: {
    color: commandColors.alertMuted,
  },
  justification: {
    borderTopColor: colors.borderSubtle,
    borderTopWidth: 1,
    marginTop: spacing.sm + spacing.xs,
    paddingTop: spacing.sm + spacing.xs,
  },
  commandJustification: {
    borderTopColor: commandColors.borderStrong,
  },
  justificationLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  commandJustificationLabel: {
    color: commandColors.alertMuted,
  },
  reason: {
    color: colors.textPrimary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  commandReason: {
    color: commandColors.ink,
  },
  reasonType: {
    color: colors.red,
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  commandReasonType: {
    color: commandColors.alert,
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
    backgroundColor: colors.bgCard,
    borderColor: colors.textPrimary,
  },
  commandAccept: {
    backgroundColor: commandColors.accentDark,
    borderColor: commandColors.accentDark,
  },
  reject: {
    backgroundColor: surfaces.redBg,
    borderColor: colors.red,
  },
  commandReject: {
    backgroundColor: commandColors.alertBg,
    borderColor: commandColors.alert,
  },
  actionText: {
    ...typography.label,
    fontWeight: "700",
  },
  acceptText: {
    color: colors.textPrimary,
  },
  commandAcceptText: {
    color: commandColors.white,
  },
  rejectText: {
    color: colors.red,
  },
  commandRejectText: {
    color: commandColors.alert,
  },
});
