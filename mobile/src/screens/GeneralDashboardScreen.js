import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../api/client";
import BrandSymbol from "../components/BrandSymbol";
import CommandActionDock from "../components/CommandActionDock";
import DaySelector from "../components/DaySelector";
import EmptyState from "../components/EmptyState";
import LionEmblem from "../components/LionEmblem";
import MissionCard, { MissionProgress } from "../components/MissionCard";
import ModeSwitchButton from "../components/ModeSwitchButton";
import SectionHeader from "../components/SectionHeader";
import StatusNotice from "../components/StatusNotice";
import TacticalPanel from "../components/TacticalPanel";
import TacticalScreen from "../components/TacticalScreen";
import GeneralReviewScreen from "./GeneralReviewScreen";
import MissionFormScreen from "./MissionFormScreen";
import { bunkerTheme as theme } from "../theme/bunkermodeTheme";
import { isCompleted, isDoneNotMarked } from "../utils/missionStatus";

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

function normalizePrazo(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    return value;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-");
    return `${day}-${month}-${year}`;
  }
  return value;
}

function formatWeekLabel(weekDays) {
  if (!weekDays.length) {
    return "";
  }
  return `${formatShortDate(weekDays[0])} a ${formatShortDate(weekDays[6])}`;
}

function formatSelectedDate(date) {
  try {
    return date
      .toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      })
      .toUpperCase();
  } catch {
    return formatShortDate(date);
  }
}

function mergeMissionLists(...missionLists) {
  const missionsById = new Map();

  missionLists.flat().forEach((mission) => {
    if (!mission?.id) {
      return;
    }

    missionsById.set(mission.id, mission);
  });

  return Array.from(missionsById.values());
}

export default function GeneralDashboardScreen({
  token,
  user,
  onLogout,
  onUserChange,
}) {
  const insets = useSafeAreaInsets();
  const [missions, setMissions] = useState([]);
  const [reviewMissions, setReviewMissions] = useState([]);
  const [historicalMissions, setHistoricalMissions] = useState([]);
  const [dailyProgressMissions, setDailyProgressMissions] = useState([]);
  const [reviewState, setReviewState] = useState(null);
  const [weeklyReviews, setWeeklyReviews] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formMission, setFormMission] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [activatingSoldier, setActivatingSoldier] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [activeScreen, setActiveScreen] = useState("home");
  const [commandDockHeight, setCommandDockHeight] = useState(112);
  const [soldierConfirmOpen, setSoldierConfirmOpen] = useState(false);

  useEffect(() => {
    loadAll({ initial: true });
  }, [token]);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const weekLabel = formatWeekLabel(weekDays);
  const selectedDateApi = formatDateForApi(selectedDate);
  const todayDate = useMemo(() => startOfDay(new Date()), []);
  const selectedDateLabel = formatSelectedDate(selectedDate);
  const generalName = user?.nome_general || user?.usuario || "General";
  const visibleReviewMissions = useMemo(
    () => reviewMissions.filter((mission) => !isDoneNotMarked(mission)),
    [reviewMissions]
  );
  const hasReview = visibleReviewMissions.length > 0;
  const reviewCount = visibleReviewMissions.length + (reviewState?.pending ? 1 : 0);
  const dailyMissions = useMemo(
    () => mergeMissionLists(missions, dailyProgressMissions, reviewMissions, historicalMissions),
    [dailyProgressMissions, historicalMissions, missions, reviewMissions]
  );

  const selectedMissions = useMemo(
    () => dailyMissions.filter((mission) => normalizePrazo(mission?.prazo) === selectedDateApi),
    [dailyMissions, selectedDateApi]
  );

  const missionStatsByDate = useMemo(() => {
    const stats = {};
    dailyMissions.forEach((mission) => {
      const key = normalizePrazo(mission?.prazo);
      if (!key) {
        return;
      }
      const current = stats[key] || { completed: 0, total: 0 };
      stats[key] = {
        completed: current.completed + (isCompleted(mission) ? 1 : 0),
        total: current.total + 1,
      };
    });
    return stats;
  }, [dailyMissions]);

  const selectedCompletedCount = useMemo(
    () => selectedMissions.filter(isCompleted).length,
    [selectedMissions]
  );
  const selectedRemainingCount = Math.max(0, selectedMissions.length - selectedCompletedCount);
  const selectedDecidedCount = selectedMissions.filter((mission) => mission?.is_decided === true).length;

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

    const [
      missionsResult,
      reviewResult,
      historicalResult,
      reviewStateResult,
      weeklyReviewsResult,
    ] = await Promise.all([
      api.listMissions(token),
      api.listReviewMissions(token),
      api.listHistoricalMissions(token),
      api.getReviewState(token),
      api.listWeeklyReviews(token),
    ]);

    setInitialLoading(false);
    setRefreshing(false);

    for (const result of [missionsResult, reviewResult, historicalResult, reviewStateResult, weeklyReviewsResult]) {
      if (await handleUnauthorized(result)) {
        return;
      }
    }

    let nextError = "";

    if (missionsResult.ok) {
      setMissions(missionsResult.data);
    } else {
      nextError = getErrorMessage(missionsResult, "Não foi possível carregar ordens.");
    }

    if (reviewResult.ok) {
      setReviewMissions(reviewResult.data);
    } else if (!nextError) {
      nextError = getErrorMessage(reviewResult, "Não foi possível carregar relatório.");
    }

    if (historicalResult.ok) {
      setHistoricalMissions(historicalResult.data);
    } else if (!nextError) {
      nextError = getErrorMessage(historicalResult, "Não foi possível carregar histórico.");
    }

    if (reviewStateResult.ok) {
      setReviewState(reviewStateResult.data);
    } else if (!nextError) {
      nextError = getErrorMessage(reviewStateResult, "Não foi possível carregar a revisão semanal.");
    }

    if (weeklyReviewsResult.ok) {
      setWeeklyReviews(Array.isArray(weeklyReviewsResult.data) ? weeklyReviewsResult.data : []);
    } else if (!nextError) {
      nextError = getErrorMessage(weeklyReviewsResult, "Não foi possível carregar o histórico de revisões.");
    }

    setDailyProgressMissions([]);
    setError(nextError);
  }

  async function closeWeeklyReview(payload) {
    setError("");
    const result = await api.closeWeeklyReview(token, payload);

    if (await handleUnauthorized(result)) {
      return false;
    }
    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível fechar a revisão do General."));
      await loadAll();
      return false;
    }

    await loadAll();
    return true;
  }

  async function activateSoldier() {
    setActivatingSoldier(true);
    const result = await api.setSessionMode(token, { mode: "soldier" });
    if (await handleUnauthorized(result)) {
      setActivatingSoldier(false);
      return;
    }
    if (!result.ok) {
      setActivatingSoldier(false);
      setError(getErrorMessage(result, "Não foi possível ativar o Soldado."));
      return;
    }

    const userResult = await api.getCurrentUser(token);
    if (await handleUnauthorized(userResult)) {
      setActivatingSoldier(false);
      return;
    }
    if (!userResult.ok) {
      setActivatingSoldier(false);
      setSoldierConfirmOpen(false);
      await onUserChange(result.data);
      return;
    }
    if (userResult.data?.active_mode !== "soldier") {
      setActivatingSoldier(false);
      setError(getErrorMessage(userResult, "Não foi possível confirmar o modo Soldado."));
      return;
    }

    setActivatingSoldier(false);
    setSoldierConfirmOpen(false);
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
    if (!mission?.id) {
      setError("Ordem inválida para alterar Decidida.");
      return;
    }

    setTogglingId(mission?.id);
    setError("");
    const result = await api.toggleMissionDecision(token, mission?.id);

    if (await handleUnauthorized(result)) {
      setTogglingId(null);
      return;
    }

    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível alterar Decidida."));
    }

    await loadAll();
    setTogglingId(null);
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
      <TacticalScreen variant="general">
        <View style={styles.loading}>
          <BrandSymbol muted size={82} />
          <ActivityIndicator color={theme.colors.fire} />
          <Text style={styles.loadingText}>SINCRONIZANDO COMANDO</Text>
        </View>
      </TacticalScreen>
    );
  }

  const commandDock = (
    <CommandActionDock
      active={activeScreen === "reviews"}
      bottomInset={insets.bottom}
      count={reviewCount}
      generalName={generalName}
      onLayout={(event) => {
        const nextHeight = Math.ceil(event.nativeEvent.layout.height);
        setCommandDockHeight((currentHeight) => (
          currentHeight === nextHeight ? currentHeight : nextHeight
        ));
      }}
      onLogout={onLogout}
      onReviewPress={() => setActiveScreen("reviews")}
      weekLabel={weekLabel}
    />
  );

  if (activeScreen === "reviews") {
    return (
      <>
        <GeneralReviewScreen
          allMissions={dailyMissions}
          bottomPadding={commandDockHeight}
          missions={visibleReviewMissions}
          onBack={() => setActiveScreen("home")}
          onLogout={onLogout}
          onReload={() => loadAll()}
          onCloseReview={closeWeeklyReview}
          reviewState={reviewState}
          token={token}
          weeklyReviews={weeklyReviews}
        />
        {commandDock}
      </>
    );
  }

  return (
    <TacticalScreen variant="general">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: commandDockHeight + theme.spacing.xl },
        ]}
      >
        <TacticalPanel elevated style={styles.calendarPanel}>
          <SectionHeader
            eyebrow="SEMANA OPERACIONAL"
            tone="fire"
            title="A semana na parede"
            meta="Cada marca é um dia de caça. Escolha onde o General dará ordens."
          />
          <View style={styles.weekNavigation}>
            <Pressable
              onPress={() => setSelectedDate((current) => addDays(current, -7))}
              style={styles.weekButton}
            >
              <Text style={styles.weekButtonText}>ANTERIOR</Text>
            </Pressable>
            <Text numberOfLines={1} style={styles.weekLabel}>{weekLabel}</Text>
            <Pressable
              onPress={() => setSelectedDate((current) => addDays(current, 7))}
              style={styles.weekButton}
            >
              <Text style={styles.weekButtonText}>PRÓXIMA</Text>
            </Pressable>
          </View>
          <DaySelector
            missionStatsByDate={missionStatsByDate}
            onSelectDate={(date) => setSelectedDate(startOfDay(date))}
            selectedDate={selectedDate}
            todayDate={todayDate}
            weekDays={weekDays}
          />
        </TacticalPanel>

        <StatusNotice type="error" message={error} />

        <TacticalPanel fire style={styles.lionPanel}>
          <View style={styles.lionTop}>
            <View style={styles.lionCopy}>
              <Text style={styles.lionEyebrow}>LEÃO DO DIA</Text>
              <Text style={styles.lionTitle}>{selectedDateLabel}</Text>
              <Text style={styles.lionBrief}>
                {selectedRemainingCount > 0
                  ? `${selectedRemainingCount} ordens ainda sustentam a caçada.`
                  : selectedMissions.length > 0
                    ? "Caçada concluída para o dia selecionado."
                    : "Nenhuma caça definida para este dia."}
              </Text>
            </View>
            <LionEmblem size={94} />
          </View>
          <MissionProgress label="CAÇADA" missions={selectedMissions} />
          <View style={styles.sideMetrics}>
            <Metric label="ORDENS" value={selectedMissions.length} />
            <Metric label="EXECUTADAS" value={selectedCompletedCount} />
            <Metric label="RESTAM" value={selectedRemainingCount} />
          </View>
          <View style={styles.decidedSummary}>
            <View>
              <Text style={styles.decidedLabel}>DECIDIDAS</Text>
              <Text style={styles.decidedValue}>{selectedDecidedCount}</Text>
            </View>
            <Text style={styles.decidedText}>
              {selectedDecidedCount === 1 ? "1 inegociável" : `${selectedDecidedCount} inegociáveis`}
            </Text>
          </View>
        </TacticalPanel>

        <TacticalPanel fire style={styles.ordersPanel}>
          <SectionHeader
            eyebrow="ORDENS DO DIA"
            tone="fire"
            title="Plano da caça"
            meta={
              selectedMissions.length === 1
                ? "1 ordem definida para o dia selecionado."
                : `${selectedMissions.length} ordens definidas para o dia selecionado.`
            }
          />

          {selectedMissions.length > 0 ? (
            <View style={styles.missionList}>
              {selectedMissions.map((mission, index) => (
                <MissionCard
                  key={String(mission?.id ?? index)}
                  mission={mission}
                  onDelete={deleteMission}
                  onEdit={openEditForm}
                  onToggleDecision={toggleDecision}
                  toggling={togglingId === mission?.id}
                  variant="general"
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="Dia sem ordens"
              message="Nenhuma ordem foi definida para o dia selecionado."
            />
          )}

          <Pressable onPress={openCreateForm} style={styles.createButton}>
            <Text style={styles.createText}>CRIAR NOVA ORDEM</Text>
          </Pressable>
        </TacticalPanel>

        <TacticalPanel style={styles.transitionPanel}>
          <SectionHeader
            eyebrow="TRANSIÇÃO DE MODO"
            title="Entregar ordens ao Soldado"
            meta={
              hasReview
                ? "Há revisão pendente. Decida quando entrar no protocolo de execução."
                : reviewState?.pending
                  ? "Há revisão semanal pendente. Feche o ciclo antes de abrir nova semana."
                : "Ative somente quando o plano estiver pronto para ser executado."
            }
          />
          <ModeSwitchButton
            loading={activatingSoldier}
            mode="general"
            onPress={() => setSoldierConfirmOpen(true)}
          />
        </TacticalPanel>
      </ScrollView>
      {commandDock}
      {soldierConfirmOpen ? (
        <View style={styles.protocolOverlay}>
          <View style={styles.protocolBox}>
            <Text style={styles.protocolKicker}>ATIVAR SOLDADO</Text>
            <Text style={styles.protocolTitle}>Entrar em execução</Text>
            <Text style={styles.protocolText}>
              Ao entrar em execução, planejamento fica bloqueado. O Soldado não cria, edita ou renegocia ordens.
            </Text>
            <Text style={styles.protocolMeta}>
              {selectedMissions.length === 1
                ? "1 ordem no dia selecionado."
                : `${selectedMissions.length} ordens no dia selecionado.`}
            </Text>
            <View style={styles.protocolActions}>
              <Pressable
                disabled={activatingSoldier}
                onPress={() => setSoldierConfirmOpen(false)}
                style={styles.protocolSecondary}
              >
                <Text style={styles.protocolSecondaryText}>CANCELAR</Text>
              </Pressable>
              <Pressable
                disabled={activatingSoldier}
                onPress={activateSoldier}
                style={[styles.protocolPrimary, activatingSoldier && styles.protocolDisabled]}
              >
                <Text style={styles.protocolPrimaryText}>
                  {activatingSoldier ? "ATIVANDO" : "ATIVAR SOLDADO"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </TacticalScreen>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.md,
    justifyContent: "center",
  },
  loadingText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  content: {
    padding: theme.spacing.screen,
  },
  calendarPanel: {
    marginBottom: theme.spacing.md,
  },
  weekNavigation: {
    alignItems: "center",
    backgroundColor: "rgba(17,17,17,0.52)",
    borderColor: theme.colors.borderSoft,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  weekButton: {
    alignItems: "center",
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: theme.spacing.sm,
  },
  weekButtonText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  weekLabel: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    flex: 1,
    textAlign: "center",
  },
  lionPanel: {
    marginTop: theme.spacing.md,
  },
  lionTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  lionCopy: {
    flex: 1,
    minWidth: 0,
  },
  lionEyebrow: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  lionTitle: {
    ...theme.typography.heading,
    color: theme.colors.white,
    fontSize: 21,
    marginTop: 2,
  },
  lionCounter: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.border,
    borderWidth: 1,
    minWidth: 58,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  lionCounterValue: {
    color: theme.colors.white,
    fontSize: 22,
    fontWeight: "900",
  },
  lionCounterLabel: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    marginTop: -2,
  },
  lionBrief: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  sideMetrics: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  metricBox: {
    backgroundColor: "rgba(0,0,0,0.28)",
    borderColor: theme.colors.borderSoft,
    borderWidth: 1,
    flex: 1,
    padding: theme.spacing.sm,
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
  decidedSummary: {
    alignItems: "center",
    backgroundColor: theme.colors.purpleWash,
    borderColor: theme.colors.purpleBorder,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  decidedLabel: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    fontSize: 9,
  },
  decidedValue: {
    color: theme.colors.neonPurple,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 23,
  },
  decidedText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    flexShrink: 1,
    textAlign: "right",
  },
  createButton: {
    alignItems: "center",
    backgroundColor: theme.colors.fire,
    borderColor: theme.colors.fire,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: theme.spacing.md,
    minHeight: 54,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadow.fire,
  },
  createText: {
    ...theme.typography.label,
    color: theme.colors.black,
    fontSize: 14,
  },
  ordersPanel: {
    marginTop: theme.spacing.md,
  },
  missionList: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  transitionPanel: {
    marginTop: theme.spacing.md,
  },
  protocolOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    padding: theme.spacing.screen,
  },
  protocolBox: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    width: "100%",
  },
  protocolKicker: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  protocolTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  protocolText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  protocolMeta: {
    ...theme.typography.caption,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderColor: theme.colors.borderSoft,
    borderWidth: 1,
    color: theme.colors.fire,
    padding: theme.spacing.sm,
  },
  protocolActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  protocolSecondary: {
    alignItems: "center",
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  protocolSecondaryText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  protocolPrimary: {
    alignItems: "center",
    backgroundColor: theme.colors.fire,
    borderColor: theme.colors.fire,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  protocolPrimaryText: {
    ...theme.typography.small,
    color: theme.colors.black,
  },
  protocolDisabled: {
    opacity: 0.58,
  },
});
