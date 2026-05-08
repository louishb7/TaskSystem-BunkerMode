import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import { formatDisplayDate } from "../utils/dates";
import { bunkerTheme as theme } from "../theme/bunkermodeTheme";
import EmptyState from "./EmptyState";
import TacticalPanel from "./TacticalPanel";

const failureReasonLabels = {
  not_done: "Não fez",
  done_not_marked: "Fez, mas não registrou",
  partially_done: "Fez parcialmente",
  external_blocker: "Imprevisto real",
  other: "Outro motivo",
};

function getErrorMessage(result, fallback) {
  return result?.data?.detail || fallback;
}

export default function ReviewPanel({ missions, onLogout, onReload, token }) {
  if (!missions?.length) {
    return (
      <TacticalPanel muted style={styles.emptyPanel}>
        <EmptyState
          title="Sem pós-ação pendente"
          message="Nenhuma falha aguarda decisão do General."
        />
      </TacticalPanel>
    );
  }

  return (
    <TacticalPanel danger style={styles.panel}>
      <Text style={styles.header}>PÓS-AÇÃO: FALHAS AGUARDANDO DECISÃO</Text>
      <View style={styles.list}>
        {missions.map((mission, index) => (
          <ReviewItem
            key={String(mission?.id ?? index)}
            mission={mission}
            onLogout={onLogout}
            onReload={onReload}
            token={token}
          />
        ))}
      </View>
    </TacticalPanel>
  );
}

function ReviewItem({ mission, onLogout, onReload, token }) {
  const [loadingAction, setLoadingAction] = useState("");
  const [error, setError] = useState("");
  const failedAt = mission?.failed_at ? `Falhou em ${formatDisplayDate(mission.failed_at)}` : "";
  const reasonTypeLabel = failureReasonLabels[mission?.failure_reason_type] || "Tipo não informado";

  async function review(accepted) {
    setLoadingAction(accepted ? "accept" : "reject");
    setError("");
    const result = await api.submitGeneralReview(token, mission?.id, { accepted });
    setLoadingAction("");

    if (result.status === 401) {
      onLogout?.();
      return;
    }

    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível revisar a falha."));
      return;
    }

    onReload?.();
  }

  return (
    <View style={styles.item}>
      <Text style={styles.kicker}>REVISÃO</Text>
      <Text style={styles.title}>{mission?.titulo || "Sem título"}</Text>
      <Text style={styles.meta}>Prazo: {mission?.prazo || "Sem prazo"}{failedAt ? ` / ${failedAt}` : ""}</Text>

      <View style={styles.reasonBox}>
        <Text style={styles.reasonLabel}>JUSTIFICATIVA DO SOLDADO</Text>
        <Text style={styles.reasonType}>{reasonTypeLabel}</Text>
        <Text style={styles.reason}>{mission?.failure_reason || "Justificativa não registrada."}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          disabled={Boolean(loadingAction)}
          onPress={() => review(true)}
          style={[styles.action, styles.accept]}
        >
          {loadingAction === "accept" ? (
            <ActivityIndicator color={theme.colors.black} />
          ) : (
            <Text style={styles.acceptText}>ACEITAR</Text>
          )}
        </Pressable>
        <Pressable
          disabled={Boolean(loadingAction)}
          onPress={() => review(false)}
          style={[styles.action, styles.reject]}
        >
          {loadingAction === "reject" ? (
            <ActivityIndicator color={theme.colors.red} />
          ) : (
            <Text style={styles.rejectText}>REJEITAR</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: theme.spacing.sm,
  },
  emptyPanel: {
    marginTop: theme.spacing.sm,
  },
  header: {
    ...theme.typography.small,
    color: theme.colors.red,
    marginBottom: theme.spacing.md,
  },
  list: {
    gap: theme.spacing.md,
  },
  item: {
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.red,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  kicker: {
    ...theme.typography.small,
    color: theme.colors.red,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.text,
    fontSize: 18,
    marginTop: theme.spacing.xs,
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  reasonBox: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  reasonLabel: {
    ...theme.typography.small,
    color: theme.colors.textDim,
  },
  reasonType: {
    ...theme.typography.caption,
    color: theme.colors.red,
    fontWeight: "800",
    marginTop: theme.spacing.xs,
  },
  reason: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.red,
    marginTop: theme.spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  action: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    minHeight: theme.layout.actionHeight,
    justifyContent: "center",
  },
  accept: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  reject: {
    backgroundColor: theme.colors.redWash,
    borderColor: theme.colors.red,
  },
  acceptText: {
    ...theme.typography.label,
    color: theme.colors.black,
  },
  rejectText: {
    ...theme.typography.label,
    color: theme.colors.red,
  },
});
