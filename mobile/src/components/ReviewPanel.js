import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "../api/client";
import { formatDateTime } from "../utils/dates";
import { STATUS, isCompleted, isDoneNotMarked } from "../utils/missionStatus";
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

function parseMissionDate(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dayRaw, monthRaw, yearRaw] = value.split("-");
    const parsed = new Date(Number(yearRaw), Number(monthRaw) - 1, Number(dayRaw));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [yearRaw, monthRaw, dayRaw] = value.slice(0, 10).split("-");
    const parsed = new Date(Number(yearRaw), Number(monthRaw) - 1, Number(dayRaw));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function startOfDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value, amount) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function getWeekStart(today) {
  const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay();
  return addDays(today, mondayOffset);
}

function formatRangeDate(date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function isFailureMission(mission) {
  return String(mission?.status_code || "").startsWith("FALHA")
    && !isDoneNotMarked(mission)
    && !isClearedInformativeFailure(mission);
}

function isClearedInformativeFailure(mission) {
  return mission?.status_code === STATUS.FALHA_REVISADA
    && mission?.is_decided !== true
    && mission?.general_verdict === "accepted";
}

function isPendingMission(mission) {
  return mission?.status_code === STATUS.PENDENTE;
}

function uniqueMissions(missions) {
  const seen = new Set();
  return missions.filter((mission) => {
    if (!mission?.id || seen.has(mission.id)) {
      return false;
    }
    seen.add(mission.id);
    return true;
  });
}

function formatOperationalDate(value) {
  if (!value || typeof value !== "string") {
    return "data indisponível";
  }
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

function formatOperationalPeriod(period) {
  if (!period?.start_date || !period?.end_date) {
    return "Período indisponível";
  }
  return `${formatOperationalDate(period.start_date)} a ${formatOperationalDate(period.end_date)}`;
}

export default function ReviewPanel({
  allMissions = [],
  missions = [],
  onCloseReview,
  onLogout,
  onReload,
  reviewState,
  token,
  weeklyReviews = [],
}) {
  const [period, setPeriod] = useState("week");
  const [failuresOpen, setFailuresOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [closingReview, setClosingReview] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
  const range = useMemo(() => {
    if (period === "month") {
      return {
        end: today,
        label: `Mês até ${formatRangeDate(today)}`,
        start: new Date(today.getFullYear(), today.getMonth(), 1),
      };
    }

    const weekStart = getWeekStart(today);
    return {
      end: today,
      label: `${formatRangeDate(weekStart)} a ${formatRangeDate(today)}`,
      start: weekStart,
    };
  }, [period, today]);
  const sourceMissions = allMissions.length ? allMissions : missions;
  const scopedMissions = sourceMissions.filter((mission) => {
    const missionDate = parseMissionDate(mission?.prazo);
    if (!missionDate) {
      return true;
    }
    return missionDate.getTime() >= range.start.getTime() && missionDate.getTime() <= range.end.getTime();
  });
  const scopedReviewMissions = missions.filter((mission) => {
    if (isDoneNotMarked(mission)) {
      return false;
    }

    const missionDate = parseMissionDate(mission?.prazo);
    if (!missionDate) {
      return true;
    }
    return missionDate.getTime() >= range.start.getTime() && missionDate.getTime() <= range.end.getTime();
  });
  const total = scopedMissions.length;
  const completed = scopedMissions.filter(isCompleted).length;
  const pending = scopedMissions.filter(isPendingMission).length;
  const failures = scopedMissions.filter(isFailureMission);
  const decidedFailures = failures.filter((mission) => mission?.is_decided === true);
  const failuresForList = uniqueMissions([...scopedReviewMissions, ...failures]);
  const pendingDecisionCount = scopedReviewMissions.filter((mission) => mission?.is_decided === true).length;
  const huntRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = Math.max(0, total - completed);
  const weeklyReport = reviewState?.reading?.report || {};
  const weeklyPending = reviewState?.reading?.pending_missions || 0;
  const weeklyTotal = (weeklyReport.total_missions || 0) + weeklyPending;
  const weeklyFailures = Array.isArray(reviewState?.reading?.failures) ? reviewState.reading.failures : [];
  const brokenDecided = Array.isArray(reviewState?.reading?.broken_decided) ? reviewState.reading.broken_decided : [];
  const hasWeeklyReview = Boolean(reviewState?.pending || reviewState?.review);
  const executionReading = (() => {
    if (total === 0) {
      return "Sem ordens no período carregado. O relatório fica limpo até haver execução registrada.";
    }

    if (decidedFailures.length > 0) {
      return `${decidedFailures.length} ordem decidida falhou no período. Priorize a decisão do General antes de avançar.`;
    }

    if (failures.length > 0) {
      return `${failures.length} falha registrada no período. Use como leitura operacional; falhas normais não exigem decisão.`;
    }

    if (remaining > 0) {
      return `${remaining} ordem ainda não foi executada no período. A leitura só fecha quando a caçada terminar.`;
    }

    return "Todas as ordens carregadas para o período foram executadas sem falha registrada.";
  })();

  async function closeReview() {
    setClosingReview(true);
    const closed = await onCloseReview?.({ observacao: reviewNote.trim() || null });
    setClosingReview(false);
    if (closed) {
      setReviewNote("");
    }
  }

  return (
    <View style={styles.stack}>
      {hasWeeklyReview ? (
        <TacticalPanel danger={reviewState?.pending} fire={!reviewState?.pending} style={styles.weeklyPanel}>
          <Text style={[styles.kicker, reviewState?.pending && styles.dangerText]}>
            {reviewState?.pending ? "REVISÃO DO GENERAL PENDENTE" : "REVISÃO DO GENERAL FECHADA"}
          </Text>
          <Text style={styles.title}>Semana operacional anterior</Text>
          <Text style={styles.meta}>{formatOperationalPeriod(reviewState?.period)}</Text>
          <Text style={styles.reading}>
            Leitura fria da semana. Fecha o ciclo sem alterar ordens nem recalcular histórico.
          </Text>

          <View style={styles.metrics}>
            <Metric label="ORDENS" value={weeklyTotal} />
            <Metric label="EXECUTADAS" value={weeklyReport.completed_missions || 0} />
            <Metric label="PENDENTES" value={weeklyPending} />
            <Metric label="FALHAS" value={weeklyReport.failed_missions || 0} purple />
          </View>

          <Text style={styles.meta}>
            Decididas quebradas: {weeklyReport.committed_missions_failed || 0}
          </Text>

          {reviewState?.pending ? (
            <View style={styles.closeBox}>
              <Text style={styles.reasonLabel}>OBSERVAÇÃO DO GENERAL</Text>
              <TextInput
                multiline
                onChangeText={setReviewNote}
                placeholder="Registro opcional sobre a leitura operacional."
                placeholderTextColor={theme.colors.textDim}
                style={styles.noteInput}
                value={reviewNote}
              />
              <Pressable
                disabled={closingReview}
                onPress={closeReview}
                style={[styles.openButton, styles.closeButton, closingReview && styles.disabled]}
              >
                {closingReview ? (
                  <ActivityIndicator color={theme.colors.black} />
                ) : (
                  <Text style={styles.closeButtonText}>FECHAR REVISÃO</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Text style={styles.meta}>Fechada em {formatDateTime(reviewState?.review?.reviewed_at)}.</Text>
          )}

          <View style={styles.list}>
            <Text style={[styles.failureKicker, styles.dangerText]}>FALHAS DA SEMANA</Text>
            {weeklyFailures.length > 0 ? weeklyFailures.slice(0, 3).map((mission, index) => (
              <View key={String(mission?.id ?? index)} style={styles.itemCompact}>
                <Text style={styles.itemTitle}>{mission?.titulo || "Sem título"}</Text>
                <Text style={styles.itemMeta}>{mission?.failure_reason || "Justificativa não registrada."}</Text>
              </View>
            )) : (
              <Text style={styles.meta}>Nenhuma falha contabilizada na semana.</Text>
            )}
          </View>

          {brokenDecided.length > 0 ? (
            <View style={styles.list}>
              <Text style={[styles.failureKicker, styles.dangerText]}>DECIDIDAS QUEBRADAS</Text>
              {brokenDecided.slice(0, 3).map((mission, index) => (
                <View key={String(mission?.id ?? index)} style={styles.itemCompact}>
                  <Text style={styles.itemTitle}>{mission?.titulo || "Sem título"}</Text>
                  <Text style={styles.itemMeta}>{mission?.failure_reason || "Sem justificativa registrada."}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </TacticalPanel>
      ) : null}

      <TacticalPanel fire style={styles.summaryPanel}>
        <View style={styles.toolbar}>
          <View style={styles.toolbarCopy}>
            <Text style={styles.kicker}>CAÇADA</Text>
            <Text style={styles.title}>Taxa de execução</Text>
            <Text style={styles.meta}>{range.label}</Text>
          </View>
          <View style={styles.toggle}>
            <PeriodButton active={period === "week"} label="SEMANA" onPress={() => setPeriod("week")} />
            <PeriodButton active={period === "month"} label="MÊS" onPress={() => setPeriod("month")} />
          </View>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.reading}>{executionReading}</Text>
          <Text style={styles.rate}>{huntRate}%</Text>
        </View>

        <View style={styles.metrics}>
          <Metric label="ORDENS" value={total} />
          <Metric label="EXECUTADAS" value={completed} />
          <Metric label="PENDENTES" value={pending} />
          <Metric label="FALHAS" value={failures.length} purple />
        </View>
      </TacticalPanel>

      <TacticalPanel danger style={styles.failurePanel}>
        <Text style={styles.failureKicker}>FALHAS AGUARDANDO DECISÃO</Text>
        <Text style={styles.failureCount}>{pendingDecisionCount}</Text>
        <Text style={styles.failureMeta}>
          {failuresForList.length > 0
            ? `${failuresForList.length} registro no relatório de falhas.`
            : "Relatório de falhas limpo para este período."}
        </Text>
        <Pressable
          disabled={!failuresForList.length}
          onPress={() => setFailuresOpen((current) => !current)}
          style={[styles.openButton, !failuresForList.length && styles.disabled]}
        >
          <Text style={styles.openButtonText}>{failuresOpen ? "FECHAR" : "ABRIR"}</Text>
        </Pressable>

        {failuresOpen ? (
          failuresForList.length > 0 ? (
            <View style={styles.list}>
              {failuresForList.map((mission, index) => (
                <ReviewItem
                  key={String(mission?.id ?? index)}
                  mission={mission}
                  onLogout={onLogout}
                  onReload={onReload}
                  token={token}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="Sem relatório pendente"
              message="Nenhuma falha está visível neste período."
            />
          )
        ) : null}
      </TacticalPanel>

      <TacticalPanel style={styles.historyPanel}>
        <Text style={styles.kicker}>HISTÓRICO DE REVISÕES</Text>
        {weeklyReviews.length > 0 ? (
          <View style={styles.list}>
            {weeklyReviews.slice(0, 5).map((review) => (
              <View key={String(review.id)} style={styles.itemCompact}>
                <Text style={styles.itemTitle}>{formatOperationalDate(review.reviewed_at)}</Text>
                <Text style={styles.itemMeta}>
                  {formatOperationalDate(review.start_date)} a {formatOperationalDate(review.end_date)}
                </Text>
                <Text style={styles.reason}>{review.resumo_operacional}</Text>
                {review.observacao ? <Text style={styles.infoNote}>{review.observacao}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.meta}>Nenhuma revisão semanal foi fechada ainda.</Text>
        )}
      </TacticalPanel>
    </View>
  );
}

function PeriodButton({ active, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.periodButton, active && styles.periodButtonActive]}>
      <Text style={[styles.periodButtonText, active && styles.periodButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Metric({ label, purple = false, value }) {
  return (
    <View style={[styles.metric, purple && styles.metricPurple]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, purple && styles.metricValuePurple]}>{value}</Text>
    </View>
  );
}

function ReviewItem({ mission, onLogout, onReload, token }) {
  const [loadingAction, setLoadingAction] = useState("");
  const [error, setError] = useState("");
  const failedAt = mission?.failed_at ? `Falhou em ${formatDateTime(mission.failed_at)}` : "";
  const reasonTypeLabel = failureReasonLabels[mission?.failure_reason_type] || "Tipo não informado";
  const requiresDecision = mission?.is_decided === true;

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
      <Text style={[styles.itemKicker, requiresDecision ? styles.itemKickerDanger : styles.itemKickerFire]}>
        {requiresDecision ? "REVISÃO OBRIGATÓRIA" : "REGISTRO INFORMATIVO"}
      </Text>
      <Text style={styles.itemTitle}>{mission?.titulo || "Sem título"}</Text>
      <Text style={styles.itemMeta}>Prazo: {mission?.prazo || "Sem prazo"}{failedAt ? ` / ${failedAt}` : ""}</Text>

      <View style={styles.reasonBox}>
        <Text style={styles.reasonLabel}>JUSTIFICATIVA DO SOLDADO</Text>
        <Text style={styles.reasonType}>{reasonTypeLabel}</Text>
        <Text style={styles.reason}>{mission?.failure_reason || "Justificativa não registrada."}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {requiresDecision ? (
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
      ) : (
        <Text style={styles.infoNote}>Falha normal registrada para leitura. Não exige decisão do General.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: theme.spacing.md,
  },
  weeklyPanel: {
    gap: theme.spacing.md,
  },
  summaryPanel: {
    gap: theme.spacing.md,
  },
  toolbar: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  toolbarCopy: {
    gap: 3,
  },
  kicker: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  dangerText: {
    color: theme.colors.red,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  toggle: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  periodButton: {
    alignItems: "center",
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: "center",
  },
  periodButtonActive: {
    backgroundColor: theme.colors.fireWash,
    borderColor: theme.colors.fire,
  },
  periodButtonText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  periodButtonTextActive: {
    color: theme.colors.fire,
  },
  summaryBox: {
    backgroundColor: "rgba(0,0,0,0.26)",
    borderColor: "rgba(255,138,42,0.22)",
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  reading: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  rate: {
    color: theme.colors.fire,
    fontSize: 42,
    fontWeight: "900",
    lineHeight: 46,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  metric: {
    backgroundColor: "rgba(0,0,0,0.28)",
    borderColor: theme.colors.borderSoft,
    borderWidth: 1,
    flexBasis: "31%",
    flexGrow: 1,
    padding: theme.spacing.sm,
  },
  metricPurple: {
    backgroundColor: theme.colors.purpleWash,
    borderColor: theme.colors.purpleBorder,
  },
  metricLabel: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    fontSize: 9,
  },
  metricValue: {
    color: theme.colors.fire,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
    marginTop: theme.spacing.xs,
  },
  metricValuePurple: {
    color: theme.colors.neonPurple,
  },
  failurePanel: {
    gap: theme.spacing.sm,
  },
  historyPanel: {
    gap: theme.spacing.sm,
  },
  failureKicker: {
    ...theme.typography.small,
    color: theme.colors.red,
  },
  failureCount: {
    color: theme.colors.red,
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 40,
  },
  failureMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  openButton: {
    alignItems: "center",
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  openButtonText: {
    ...theme.typography.small,
    color: theme.colors.text,
  },
  list: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  closeBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderColor: theme.colors.borderSoft,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  noteInput: {
    ...theme.typography.body,
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 92,
    padding: theme.spacing.sm,
    textAlignVertical: "top",
  },
  closeButton: {
    backgroundColor: theme.colors.fire,
    borderColor: theme.colors.fire,
  },
  closeButtonText: {
    ...theme.typography.label,
    color: theme.colors.black,
  },
  item: {
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.red,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  itemCompact: {
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.borderSoft,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  itemKicker: {
    ...theme.typography.small,
  },
  itemKickerDanger: {
    color: theme.colors.red,
  },
  itemKickerFire: {
    color: theme.colors.fire,
  },
  itemTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
    fontSize: 18,
    marginTop: theme.spacing.xs,
  },
  itemMeta: {
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
  infoNote: {
    ...theme.typography.caption,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  disabled: {
    opacity: 0.45,
  },
});
