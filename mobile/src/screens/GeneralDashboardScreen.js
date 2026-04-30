import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import EmptyState from "../components/EmptyState";
import GeneralMissionCard from "../components/GeneralMissionCard";
import ReportSummary from "../components/ReportSummary";
import ReviewBlock from "../components/ReviewBlock";
import StatusNotice from "../components/StatusNotice";
import MissionFormScreen from "./MissionFormScreen";
import { isOperationalMission } from "../utils/missionStatus";
import { radius, spacing, typography } from "../styles/tokens";
import { generalTheme } from "../styles/generalTheme";

const commandColors = generalTheme.colors;
const weekDayLabels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function getErrorMessage(result, fallback) {
  if (result?.status === 0) {
    return "Não foi possível conectar à API.";
  }
  return result?.data?.detail || fallback;
}

function startOfDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value, amount) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function getWeekDays(referenceDate) {
  const base = startOfDay(referenceDate);
  const mondayOffset = base.getDay() === 0 ? -6 : 1 - base.getDay();
  const monday = addDays(base, mondayOffset);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function formatShortDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function formatDateForApi(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
}

export default function GeneralDashboardScreen({
  token,
  user,
  onLogout,
  onUserChange,
}) {
  const [missions, setMissions] = useState([]);
  const [reviewMissions, setReviewMissions] = useState([]);
  const [report, setReport] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formMission, setFormMission] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [activatingSoldier, setActivatingSoldier] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));

  useEffect(() => {
    loadAll({ initial: true });
  }, [token]);

  const counts = useMemo(
    () => ({
      total: missions.length,
      pending: missions.filter(isOperationalMission).length,
      review: reviewMissions.length,
    }),
    [missions, reviewMissions]
  );
  const hasReview = counts.review > 0;
  const reviewTitle =
    counts.review === 1 ? "1 falha aguardando decisão" : `${counts.review} falhas aguardando decisão`;
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const selectedDateLabel = formatShortDate(selectedDate);
  const selectedDateApi = formatDateForApi(selectedDate);
  const todayTime = startOfDay(new Date()).getTime();

  async function handleUnauthorized(result) {
    if (result?.status === 401) {
      await onLogout();
      return true;
    }
    return false;
  }

  async function loadAll({ initial = false } = {}) {
    if (initial) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }

    const [missionsResult, reviewResult, reportResult] = await Promise.all([
      api.listMissions(token),
      api.listReviewMissions(token),
      api.getWeeklyReport(token),
    ]);

    setInitialLoading(false);
    setRefreshing(false);

    for (const result of [missionsResult, reviewResult, reportResult]) {
      if (await handleUnauthorized(result)) {
        return;
      }
    }

    let nextError = "";

    if (missionsResult.ok) {
      setMissions(missionsResult.data);
    } else {
      nextError = getErrorMessage(missionsResult, "Não foi possível carregar missões.");
    }

    if (reviewResult.ok) {
      setReviewMissions(reviewResult.data);
    } else if (!nextError) {
      nextError = getErrorMessage(reviewResult, "Não foi possível carregar revisões.");
    }

    if (reportResult.ok) {
      setReport(reportResult.data);
    } else if (!nextError) {
      nextError = getErrorMessage(reportResult, "Não foi possível carregar o relatório.");
    }

    setError(nextError);
  }

  async function activateSoldier() {
    setActivatingSoldier(true);
    const result = await api.setSessionMode(token, { mode: "soldier" });
    setActivatingSoldier(false);
    if (await handleUnauthorized(result)) {
      return;
    }
    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível ativar o Soldado."));
      return;
    }

    const userResult = await api.getCurrentUser(token);
    if (await handleUnauthorized(userResult)) {
      return;
    }
    if (!userResult.ok) {
      setError(getErrorMessage(userResult, "Não foi possível recarregar o usuário."));
      return;
    }

    await onUserChange(userResult.data);
  }

  function openCreateForm() {
    setFormMission(null);
    setShowForm(true);
  }

  function openEditForm(mission) {
    setFormMission(mission);
    setShowForm(true);
  }

  async function handleSaved() {
    setShowForm(false);
    setFormMission(null);
    await loadAll();
  }

  async function toggleDecision(mission) {
    setTogglingId(mission?.id);
    setError("");
    const result = await api.toggleMissionDecision(token, mission?.id);
    setTogglingId(null);

    if (await handleUnauthorized(result)) {
      return;
    }
    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível alternar a decisão."));
    }
    await loadAll();
  }

  async function deleteMission(missionId) {
    setError("");
    const result = await api.deleteMission(token, missionId);

    if (await handleUnauthorized(result)) {
      return;
    }
    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível remover a missão."));
    }
    await loadAll();
  }

  if (showForm) {
    return (
      <MissionFormScreen
        token={token}
        user={user}
        mission={formMission}
        initialPrazo={formMission ? undefined : selectedDateApi}
        onCancel={() => {
          setShowForm(false);
          setFormMission(null);
        }}
        onLogout={onLogout}
        onSave={handleSaved}
      />
    );
  }

  if (initialLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={commandColors.accentDark} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CommandBackdrop />
      <View style={styles.topBar}>
        <View style={styles.topIdentity}>
          <View style={styles.brandLockup}>
            <View style={styles.monogram}>
              <Text style={styles.monogramText}>BM</Text>
            </View>
            <Text style={styles.brand}>BUNKERMODE</Text>
          </View>
          <Text style={styles.generalName}>{user?.nome_general || user?.usuario || "General"}</Text>
        </View>
        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logout}>SAIR</Text>
        </Pressable>
      </View>

      <StatusNotice type="error" message={error} tone="command" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.operationalIntro}>
          <Text style={styles.eyebrow}>POSTO DO GENERAL</Text>
          <Text style={styles.screenTitle}>Preparar ordens</Text>
          <Text style={styles.screenCaption}>Escolha a data, revise pendências e envie o Soldado quando o plano estiver claro.</Text>
        </View>

        <View style={[styles.reviewPriority, hasReview && styles.reviewPriorityActive]}>
          <View style={styles.priorityHeader}>
            <View>
              <Text style={[styles.priorityKicker, hasReview && styles.priorityKickerAlert]}>
                {hasReview ? "REVISÃO OBRIGATÓRIA" : "REVISÃO"}
              </Text>
              <Text style={styles.priorityTitle}>
                {hasReview ? reviewTitle : "Nenhuma revisão pendente"}
              </Text>
            </View>
            <Text style={[styles.priorityState, hasReview && styles.priorityStateAlert]}>
              {hasReview ? "PRIMEIRO" : "LIMPO"}
            </Text>
          </View>
          <Text style={styles.priorityText}>
            {hasReview
              ? "Revise o resultado antes de enviar novas ordens para execução."
              : "Sem falhas abertas. O posto pode preparar ou ajustar ordens."}
          </Text>
        </View>

        {hasReview ? (
          <ReviewBlock
            missions={reviewMissions}
            tone="command"
            token={token}
            onLogout={onLogout}
            onReload={() => loadAll()}
          />
        ) : null}

        <View style={styles.weekPanel}>
          <View style={styles.weekHeader}>
            <View>
              <Text style={styles.weekKicker}>SEMANA OPERACIONAL</Text>
              <Text style={styles.weekTitle}>Data da nova ordem: {selectedDateLabel}</Text>
            </View>
          </View>
          <View style={styles.weekRow}>
            {weekDays.map((date) => {
              const dayTime = startOfDay(date).getTime();
              const selected = dayTime === selectedDate.getTime();
              const today = dayTime === todayTime;
              return (
                <Pressable
                  key={date.toISOString()}
                  onPress={() => setSelectedDate(startOfDay(date))}
                  style={[styles.dayButton, selected && styles.dayButtonSelected]}
                >
                  <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>
                    {weekDayLabels[date.getDay()]}
                  </Text>
                  <Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>
                    {String(date.getDate()).padStart(2, "0")}
                  </Text>
                  <View style={[styles.todayDot, today && styles.todayDotVisible, selected && styles.todayDotSelected]} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.actionStrip}>
          <Pressable
            onPress={openCreateForm}
            style={styles.newMissionButton}
          >
            <Text style={styles.newMissionText}>NOVA ORDEM — {selectedDateLabel}</Text>
          </Pressable>
        </View>

        <OperationalSection
          label="Fila de ordens"
          meta={counts.pending ? `${counts.pending} pendente` : "sem pendência"}
        >
          {missions.length > 0 ? (
            missions.map((mission, index) => (
              <GeneralMissionCard
                key={String(mission?.id ?? index)}
                mission={mission}
                tone="command"
                togglingId={togglingId}
                onDelete={deleteMission}
                onEdit={openEditForm}
                onToggleDecision={toggleDecision}
              />
            ))
          ) : (
            <EmptyState tone="command" />
          )}
        </OperationalSection>

        <View style={styles.transitionPanel}>
          <View style={styles.transitionCopy}>
            <Text style={styles.transitionKicker}>TRANSIÇÃO</Text>
            <Text style={styles.transitionText}>
              {hasReview ? "Há revisão pendente antes da execução." : "Plano pronto para execução."}
            </Text>
          </View>
          <Pressable
            disabled={activatingSoldier}
            onPress={activateSoldier}
            style={[
              styles.soldierButton,
              hasReview && styles.soldierButtonDeferred,
              activatingSoldier && styles.disabledButton,
            ]}
          >
            {activatingSoldier ? (
              <ActivityIndicator color={hasReview ? commandColors.accentDark : commandColors.white} />
            ) : (
              <Text style={[styles.soldierButtonText, hasReview && styles.soldierButtonDeferredText]}>
                ATIVAR SOLDADO
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.drawerList}>
          <DrawerButton
            label="Abrir relatório semanal"
            open={showReport}
            onPress={() => setShowReport((current) => !current)}
          />
          {showReport ? (
            <View style={styles.drawerBody}>
              {report ? (
                <ReportSummary report={report} tone="command" />
              ) : (
                <StatusNotice type="info" message="Nenhum dado disponível." tone="command" />
              )}
            </View>
          ) : null}

        </View>
      </ScrollView>
    </View>
  );
}

function CommandBackdrop() {
  return (
    <View pointerEvents="none" style={styles.backdrop}>
      <View style={styles.backdropLine} />
      <View style={[styles.backdropLine, styles.backdropLineSecond]} />
    </View>
  );
}

function OperationalSection({ children, label, meta }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionLabel}>{label}</Text>
          <View style={styles.sectionRule} />
        </View>
        {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function DrawerButton({ label, onPress, open }) {
  return (
    <Pressable onPress={onPress} style={styles.drawerButton}>
      <Text style={styles.drawerLabel}>{label}</Text>
      <Text style={styles.drawerState}>{open ? "FECHAR" : "ABRIR"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: commandColors.canvas,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    backgroundColor: commandColors.canvas,
    justifyContent: "center",
  },
  backdrop: {
    bottom: 0,
    left: 0,
    opacity: 0.32,
    position: "absolute",
    right: 0,
    top: 0,
  },
  backdropLine: {
    backgroundColor: commandColors.borderStrong,
    height: 1,
    left: 20,
    position: "absolute",
    right: 20,
    top: 128,
  },
  backdropLineSecond: {
    opacity: 0.6,
    top: 132,
  },
  topBar: {
    alignItems: "center",
    backgroundColor: commandColors.panel,
    borderBottomColor: commandColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenH,
    paddingVertical: spacing.sm + spacing.xs,
  },
  topIdentity: {
    gap: spacing.xs,
  },
  brand: {
    ...typography.label,
    color: commandColors.ink,
  },
  brandLockup: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  monogram: {
    alignItems: "center",
    backgroundColor: commandColors.panelMuted,
    borderColor: commandColors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  monogramText: {
    color: commandColors.accentDark,
    fontSize: 9,
    fontWeight: "900",
  },
  generalName: {
    ...typography.caption,
    color: commandColors.muted,
  },
  logoutButton: {
    borderColor: commandColors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  operationalIntro: {
    marginBottom: spacing.md,
  },
  eyebrow: {
    ...typography.small,
    color: commandColors.accentDark,
    fontWeight: "800",
  },
  screenTitle: {
    color: commandColors.ink,
    fontSize: 28,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  screenCaption: {
    color: commandColors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  logout: {
    color: commandColors.muted,
    fontSize: 12,
  },
  content: {
    padding: spacing.screenH,
    paddingBottom: spacing.xl,
  },
  weekPanel: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekKicker: {
    ...typography.small,
    color: commandColors.muted,
    fontWeight: "700",
  },
  weekTitle: {
    color: commandColors.ink,
    fontSize: 16,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  weekRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dayButton: {
    alignItems: "center",
    borderBottomColor: commandColors.border,
    borderBottomWidth: 2,
    flex: 1,
    minHeight: 58,
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  dayButtonSelected: {
    borderBottomColor: commandColors.accentDark,
  },
  dayLabel: {
    ...typography.small,
    color: commandColors.muted,
    fontWeight: "700",
  },
  dayLabelSelected: {
    color: commandColors.accentDark,
  },
  dayNumber: {
    color: commandColors.ink,
    fontSize: 17,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  dayNumberSelected: {
    color: commandColors.accentDark,
  },
  todayDot: {
    backgroundColor: commandColors.transparent,
    borderRadius: radius.pill,
    height: 4,
    marginTop: spacing.xs,
    width: 4,
  },
  todayDotVisible: {
    backgroundColor: commandColors.borderStrong,
  },
  todayDotSelected: {
    backgroundColor: commandColors.accentDark,
  },
  reviewPriority: {
    backgroundColor: commandColors.white,
    borderColor: commandColors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  reviewPriorityActive: {
    backgroundColor: commandColors.alertBg,
    borderColor: commandColors.alert,
  },
  priorityHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  priorityKicker: {
    ...typography.small,
    color: commandColors.muted,
    fontWeight: "700",
  },
  priorityKickerAlert: {
    color: commandColors.alert,
  },
  priorityTitle: {
    color: commandColors.ink,
    fontSize: 22,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  priorityState: {
    ...typography.small,
    color: commandColors.accentDark,
    fontWeight: "900",
  },
  priorityStateAlert: {
    color: commandColors.alert,
  },
  priorityText: {
    color: commandColors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  actionStrip: {
    marginTop: spacing.md,
  },
  newMissionButton: {
    alignItems: "center",
    backgroundColor: commandColors.accentDark,
    borderColor: commandColors.accentDark,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  newMissionText: {
    ...typography.label,
    color: commandColors.white,
    fontWeight: "900",
  },
  transitionPanel: {
    alignItems: "center",
    borderTopColor: commandColors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  transitionCopy: {
    flex: 1,
  },
  transitionKicker: {
    ...typography.small,
    color: commandColors.muted,
    fontWeight: "700",
  },
  transitionText: {
    color: commandColors.ink,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  soldierButton: {
    alignItems: "center",
    backgroundColor: commandColors.accentDark,
    borderColor: commandColors.accentDark,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    minWidth: 136,
    paddingHorizontal: spacing.md,
  },
  soldierButtonDeferred: {
    backgroundColor: commandColors.panelMuted,
    borderColor: commandColors.borderStrong,
  },
  disabledButton: {
    opacity: 0.7,
  },
  soldierButtonText: {
    ...typography.label,
    color: commandColors.white,
    fontWeight: "900",
  },
  soldierButtonDeferredText: {
    color: commandColors.accentDark,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm + spacing.xs,
  },
  sectionLabel: {
    ...typography.label,
    color: commandColors.ink,
  },
  sectionMeta: {
    ...typography.small,
    color: commandColors.accentDark,
    fontWeight: "700",
  },
  sectionRule: {
    backgroundColor: commandColors.accent,
    height: 2,
    marginTop: spacing.sm,
    width: 48,
  },
  drawerList: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  drawerButton: {
    alignItems: "center",
    backgroundColor: commandColors.panelMuted,
    borderColor: commandColors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  drawerLabel: {
    color: commandColors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  drawerState: {
    ...typography.small,
    color: commandColors.accentDark,
    fontWeight: "900",
  },
  drawerBody: {
    marginBottom: spacing.sm,
  },
});
