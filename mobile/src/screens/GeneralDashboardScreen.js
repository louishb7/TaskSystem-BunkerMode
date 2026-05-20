import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../api/client";
import ActivateSoldierDialog from "../components/general/ActivateSoldierDialog";
import MissionGroup from "../components/general/MissionGroup";
import Metric from "../components/general/Metric";
import OperationsSheet from "../components/general/OperationsSheet";
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
import {
  startOfDay,
  addDays,
  getWeekDays,
  formatDateForApi,
  normalizePrazo,
  formatWeekLabel,
  formatSelectedDate,
} from "../utils/date";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getErrorMessage(result, fallback) {
  if (result?.status === 0) {
    return "Não foi possível conectar à API.";
  }
  return result?.data?.detail || fallback;
}

function isFailureMission(mission) {
  return String(mission?.status_code || "").startsWith("FALHA");
}

function mergeMissionLists(...missionLists) {
  const missionsById = new Map();
  missionLists.flat().forEach((mission) => {
    if (!mission?.id) return;
    missionsById.set(mission.id, mission);
  });
  return Array.from(missionsById.values());
}

function groupMissions(missions) {
  return {
    highPriority: missions.filter((m) => m?.is_pinned === true),
    pending: missions.filter((m) => !isCompleted(m) && m?.is_pinned !== true && !isFailureMission(m)),
    failures: missions.filter((m) => !isCompleted(m) && m?.is_pinned !== true && isFailureMission(m)),
    completed: missions.filter((m) => m?.is_pinned !== true && isCompleted(m)),
  };
}

const INITIAL_OPERATION_FORM = {
  nome: "",
  start_date: "",
  end_date: "",
  weekdays: [],
  ordem_titulo: "",
  ordem_instrucao: "",
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function GeneralDashboardScreen({ token, user, onLogout, onUserChange }) {
  const insets = useSafeAreaInsets();

  // Data state
  const [missions, setMissions] = useState([]);
  const [reviewMissions, setReviewMissions] = useState([]);
  const [historicalMissions, setHistoricalMissions] = useState([]);
  const [dailyProgressMissions, setDailyProgressMissions] = useState([]);
  const [reviewState, setReviewState] = useState(null);
  const [weeklyReviews, setWeeklyReviews] = useState([]);
  const [operations, setOperations] = useState([]);
  const [dayOffs, setDayOffs] = useState([]);

  // UI state
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [operationFormOpen, setOperationFormOpen] = useState(false);
  const [operationForm, setOperationForm] = useState(INITIAL_OPERATION_FORM);
  const [operationLoading, setOperationLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formMission, setFormMission] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [justifyingId, setJustifyingId] = useState(null);
  const [activatingSoldier, setActivatingSoldier] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [activeScreen, setActiveScreen] = useState("home");
  const [commandDockHeight, setCommandDockHeight] = useState(112);
  const [soldierConfirmOpen, setSoldierConfirmOpen] = useState(false);

  const materializedWeekRef = useRef("");

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const weekLabel = formatWeekLabel(weekDays);
  const selectedDateApi = formatDateForApi(selectedDate);
  const todayDate = useMemo(() => startOfDay(new Date()), []);
  const todayDateApi = formatDateForApi(todayDate);
  const selectedDateLabel = formatSelectedDate(selectedDate);
  const generalName = user?.nome_general || user?.usuario || "General";

  const visibleReviewMissions = useMemo(
    () => reviewMissions.filter((m) => !isDoneNotMarked(m)),
    [reviewMissions],
  );
  const hasReview = visibleReviewMissions.length > 0;
  const reviewCount = visibleReviewMissions.length + (reviewState?.pending ? 1 : 0);

  const dailyMissions = useMemo(
    () => mergeMissionLists(missions, dailyProgressMissions, reviewMissions, historicalMissions),
    [dailyProgressMissions, historicalMissions, missions, reviewMissions],
  );

  const selectedMissions = useMemo(
    () => dailyMissions.filter((m) => normalizePrazo(m?.prazo) === selectedDateApi),
    [dailyMissions, selectedDateApi],
  );

  const todayMissions = useMemo(
    () => dailyMissions.filter((m) => normalizePrazo(m?.prazo) === todayDateApi),
    [dailyMissions, todayDateApi],
  );

  const missionStatsByDate = useMemo(() => {
    const stats = {};
    dailyMissions.forEach((m) => {
      const key = normalizePrazo(m?.prazo);
      if (!key) return;
      const current = stats[key] || { completed: 0, total: 0 };
      stats[key] = {
        completed: current.completed + (isCompleted(m) ? 1 : 0),
        total: current.total + 1,
      };
    });
    return stats;
  }, [dailyMissions]);

  const dayOffDates = useMemo(() => new Set(dayOffs.map((d) => d.date)), [dayOffs]);

  const selectedCompletedCount = useMemo(() => selectedMissions.filter(isCompleted).length, [selectedMissions]);
  const selectedDayOff = dayOffDates.has(selectedDateApi) || selectedMissions.length === 0;
  const selectedRemainingCount = Math.max(0, selectedMissions.length - selectedCompletedCount);
  const selectedPriorityCount = selectedMissions.filter((m) => m?.is_pinned === true).length;
  const missionGroups = useMemo(() => groupMissions(selectedMissions), [selectedMissions]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    loadAll({ initial: true });
  }, [token]);

  useEffect(() => {
    if (!token || !weekDays.length) return;
    const startDate = formatDateForApi(weekDays[0]);
    const endDate = formatDateForApi(weekDays[weekDays.length - 1]);
    const key = `${startDate}:${endDate}`;
    if (materializedWeekRef.current === key) return;
    materializedWeekRef.current = key;
    api.materializeOperations(token, { start_date: startDate, end_date: endDate }).then(async (result) => {
      if (await handleUnauthorized(result)) return;
      await loadAll();
      await loadDayOffs(startDate, endDate);
    });
  }, [token, weekLabel]);

  // ---------------------------------------------------------------------------
  // Data handlers
  // ---------------------------------------------------------------------------

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
      operationsResult,
      dayOffsResult,
    ] = await Promise.all([
      api.listMissions(token),
      api.listReviewMissions(token),
      api.listHistoricalMissions(token),
      api.getReviewState(token),
      api.listWeeklyReviews(token),
      api.listOperations(token),
      api.listDayOffs(token, {
        start_date: formatDateForApi(weekDays[0]),
        end_date: formatDateForApi(weekDays[weekDays.length - 1]),
      }),
    ]);

    setInitialLoading(false);
    setRefreshing(false);

    for (const result of [missionsResult, reviewResult, historicalResult, reviewStateResult, weeklyReviewsResult, operationsResult, dayOffsResult]) {
      if (await handleUnauthorized(result)) return;
    }

    let nextError = "";

    if (missionsResult.ok) setMissions(missionsResult.data);
    else nextError = getErrorMessage(missionsResult, "Não foi possível carregar ordens.");

    if (reviewResult.ok) setReviewMissions(reviewResult.data);
    else if (!nextError) nextError = getErrorMessage(reviewResult, "Não foi possível carregar relatório.");

    if (historicalResult.ok) setHistoricalMissions(historicalResult.data);
    else if (!nextError) nextError = getErrorMessage(historicalResult, "Não foi possível carregar histórico.");

    if (reviewStateResult.ok) setReviewState(reviewStateResult.data);
    else if (!nextError) nextError = getErrorMessage(reviewStateResult, "Não foi possível carregar a revisão semanal.");

    if (weeklyReviewsResult.ok) setWeeklyReviews(Array.isArray(weeklyReviewsResult.data) ? weeklyReviewsResult.data : []);
    else if (!nextError) nextError = getErrorMessage(weeklyReviewsResult, "Não foi possível carregar o histórico de revisões.");

    if (operationsResult.ok) setOperations(Array.isArray(operationsResult.data) ? operationsResult.data : []);
    else if (!nextError) nextError = getErrorMessage(operationsResult, "Não foi possível carregar operações.");

    if (dayOffsResult.ok) setDayOffs(Array.isArray(dayOffsResult.data?.days) ? dayOffsResult.data.days : []);
    else if (!nextError) nextError = getErrorMessage(dayOffsResult, "Não foi possível carregar Dias off.");

    setDailyProgressMissions([]);
    setError(nextError);
  }

  async function loadDayOffs(startDate, endDate) {
    const result = await api.listDayOffs(token, { start_date: startDate, end_date: endDate });
    if (await handleUnauthorized(result)) return false;
    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível carregar Dias off."));
      return false;
    }
    setDayOffs(Array.isArray(result.data?.days) ? result.data.days : []);
    return true;
  }

  async function closeWeeklyReview(payload) {
    setError("");
    const result = await api.closeWeeklyReview(token, payload);
    if (await handleUnauthorized(result)) return false;
    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível fechar a revisão do General."));
      await loadAll();
      return false;
    }
    await loadAll();
    return true;
  }

  // ---------------------------------------------------------------------------
  // Mission handlers
  // ---------------------------------------------------------------------------

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

  async function toggleDayOff(date) {
    const apiDate = formatDateForApi(date);
    const stats = missionStatsByDate[apiDate] || { total: 0 };
    const isDayOff = dayOffDates.has(apiDate);
    if (!isDayOff && stats.total > 0) {
      setError("Este dia possui ordens. Remova ou mova as ordens antes de marcar Dia off.");
      return;
    }
    const result = isDayOff
      ? await api.clearDayOff(token, apiDate)
      : await api.markDayOff(token, { date: apiDate });
    if (await handleUnauthorized(result)) return;
    if (!result.ok) {
      setError(getErrorMessage(result, isDayOff ? "Não foi possível desfazer Dia off." : "Não foi possível marcar Dia off."));
      return;
    }
    materializedWeekRef.current = "";
    await loadAll();
  }

  async function togglePin(mission) {
    if (!mission?.id) { setError("Ordem inválida para alterar prioridade."); return; }
    setTogglingId(mission?.id);
    setError("");
    const result = await api.toggleMissionPin(token, mission?.id);
    if (await handleUnauthorized(result)) { setTogglingId(null); return; }
    if (!result.ok) setError(getErrorMessage(result, "Não foi possível alterar prioridade."));
    await loadAll();
    setTogglingId(null);
  }

  async function deleteMission(missionId) {
    setError("");
    const result = await api.deleteMission(token, missionId);
    if (await handleUnauthorized(result)) return;
    if (!result.ok) setError(getErrorMessage(result, "Não foi possível remover a missão."));
    await loadAll();
  }

  async function completeMission(mission) {
    if (!mission?.id) { setError("Ordem inválida para execução."); return; }
    setCompletingId(mission.id);
    setError("");
    const result = await api.completeMission(token, mission.id);
    setCompletingId(null);
    if (await handleUnauthorized(result)) return;
    if (!result.ok) setError(getErrorMessage(result, "Não foi possível executar a ordem."));
    await loadAll();
  }

  async function justifyMission(mission, payload) {
    if (!mission?.id) { setError("Ordem inválida para registrar falha."); return; }
    setJustifyingId(mission.id);
    setError("");
    const result = await api.submitFailureJustification(token, mission.id, payload);
    setJustifyingId(null);
    if (await handleUnauthorized(result)) return;
    if (!result.ok) setError(getErrorMessage(result, "Não foi possível registrar a falha."));
    await loadAll();
  }

  // ---------------------------------------------------------------------------
  // Soldier activation
  // ---------------------------------------------------------------------------

  async function activateSoldier() {
    setActivatingSoldier(true);
    const result = await api.setSessionMode(token, { mode: "soldier" });
    if (await handleUnauthorized(result)) { setActivatingSoldier(false); return; }
    if (!result.ok) {
      setActivatingSoldier(false);
      setError(getErrorMessage(result, "Não foi possível ativar o Soldado."));
      return;
    }
    const userResult = await api.getCurrentUser(token);
    if (await handleUnauthorized(userResult)) { setActivatingSoldier(false); return; }
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

  // ---------------------------------------------------------------------------
  // Operation handlers
  // ---------------------------------------------------------------------------

  function updateOperationField(field, value) {
    setOperationForm((current) => ({ ...current, [field]: value }));
  }

  function toggleOperationWeekday(value) {
    setOperationForm((current) => {
      const selected = current.weekdays.includes(value)
        ? current.weekdays.filter((item) => item !== value)
        : [...current.weekdays, value].sort((a, b) => a - b);
      return { ...current, weekdays: selected };
    });
  }

  async function createOperation() {
    setError("");
    setOperationLoading(true);
    const result = await api.createOperation(token, {
      ...operationForm,
      ordem_instrucao: operationForm.ordem_instrucao || null,
    });
    setOperationLoading(false);
    if (await handleUnauthorized(result)) return;
    if (!result.ok) { setError(getErrorMessage(result, "Não foi possível registrar a operação.")); return; }
    setOperationForm(INITIAL_OPERATION_FORM);
    setOperationFormOpen(false);
    materializedWeekRef.current = "";
    await loadAll();
  }

  async function closeOperation(operationId) {
    setError("");
    setOperationLoading(true);
    const result = await api.closeOperation(token, operationId);
    setOperationLoading(false);
    if (await handleUnauthorized(result)) return;
    if (!result.ok) setError(getErrorMessage(result, "Não foi possível encerrar a operação."));
    await loadAll();
  }

  // ---------------------------------------------------------------------------
  // Early returns
  // ---------------------------------------------------------------------------

  if (showForm) {
    return (
      <MissionFormScreen
        token={token}
        user={user}
        mission={formMission}
        initialPrazo={formMission ? undefined : selectedDateApi}
        onCancel={() => { setShowForm(false); setFormMission(null); }}
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

  // ---------------------------------------------------------------------------
  // Shared dock
  // ---------------------------------------------------------------------------

  const commandDock = (
    <CommandActionDock
      active={activeScreen === "reviews"}
      bottomInset={insets.bottom}
      count={reviewCount}
      generalName={generalName}
      onLayout={(event) => {
        const nextHeight = Math.ceil(event.nativeEvent.layout.height);
        setCommandDockHeight((current) => (current === nextHeight ? current : nextHeight));
      }}
      onLogout={onLogout}
      onOperationsPress={() => setOperationsOpen(true)}
      onReviewPress={() => setActiveScreen("reviews")}
      weekLabel={weekLabel}
    />
  );

  // ---------------------------------------------------------------------------
  // Review screen
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <TacticalScreen variant="general">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: commandDockHeight + theme.spacing.xl },
        ]}
      >
        {/* Calendário */}
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
            dayOffDates={dayOffDates}
            missionStatsByDate={missionStatsByDate}
            onSelectDate={(date) => setSelectedDate(startOfDay(date))}
            onToggleDayOff={toggleDayOff}
            selectedDate={selectedDate}
            todayDate={todayDate}
            weekDays={weekDays}
          />
        </TacticalPanel>

        <StatusNotice type="error" message={error} />

        {/* Leão do Dia */}
        <TacticalPanel fire style={styles.lionPanel}>
          <View style={styles.lionTop}>
            <View style={styles.lionCopy}>
              <Text style={styles.lionEyebrow}>LEÃO DO DIA</Text>
              <Text style={styles.lionTitle}>{selectedDateLabel}</Text>
              <Text style={styles.lionBrief}>
                {selectedRemainingCount > 0
                  ? selectedRemainingCount === 1
                    ? "1 ordem ainda resiste à caçada."
                    : `${selectedRemainingCount} ordens ainda resistem à caçada.`
                  : selectedMissions.length > 0
                    ? "Caçada concluída para o dia selecionado."
                    : selectedDayOff
                      ? "Dia off. Sem expectativa de execução."
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
          <View style={styles.prioritySummary}>
            <View>
              <Text style={styles.priorityLabel}>PRIORIDADE ELEVADA</Text>
              <Text style={styles.priorityValue}>{selectedPriorityCount}</Text>
            </View>
            <Text style={styles.priorityText}>
              {selectedPriorityCount === 1 ? "1 ordem em destaque" : `${selectedPriorityCount} ordens em destaque`}
            </Text>
          </View>
        </TacticalPanel>

        {/* Quadro do Dia */}
        <TacticalPanel fire style={styles.ordersPanel}>
          <SectionHeader
            eyebrow="ORDENS DO DIA"
            tone="fire"
            title="Plano da caça"
            meta={
              selectedRemainingCount > 0
                ? `${selectedRemainingCount} em aberto. ${selectedCompletedCount} cumpridas no arquivo do dia.`
                : selectedCompletedCount > 0
                  ? "Todas as ordens do dia foram cumpridas."
                  : "Nenhuma ordem foi definida para o dia selecionado."
            }
          />

          {selectedMissions.length > 0 ? (
            <View style={styles.missionGroups}>
              <MissionGroup
                label="Prioridade elevada"
                missions={missionGroups.highPriority}
                completingId={completingId}
                justifyingId={justifyingId}
                onComplete={completeMission}
                onDelete={deleteMission}
                onEdit={openEditForm}
                onJustify={justifyMission}
                onTogglePin={togglePin}
                togglingId={togglingId}
                tone="critical"
              />
              <MissionGroup
                label="Pendentes"
                missions={missionGroups.pending}
                completingId={completingId}
                justifyingId={justifyingId}
                onComplete={completeMission}
                onDelete={deleteMission}
                onEdit={openEditForm}
                onJustify={justifyMission}
                onTogglePin={togglePin}
                togglingId={togglingId}
              />
              <MissionGroup
                label="Falhas em leitura"
                missions={missionGroups.failures}
                completingId={completingId}
                justifyingId={justifyingId}
                onComplete={completeMission}
                onDelete={deleteMission}
                onEdit={openEditForm}
                onJustify={justifyMission}
                onTogglePin={togglePin}
                togglingId={togglingId}
                tone="danger"
              />
              <MissionGroup
                label="Cumpridas"
                missions={missionGroups.completed}
                completingId={completingId}
                justifyingId={justifyingId}
                onComplete={completeMission}
                onDelete={deleteMission}
                onEdit={openEditForm}
                onJustify={justifyMission}
                onTogglePin={togglePin}
                togglingId={togglingId}
                tone="completed"
              />
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

        {/* Transição de Modo */}
        <TacticalPanel style={styles.transitionPanel}>
          <SectionHeader
            eyebrow="TRANSIÇÃO DE MODO"
            title="Entrar em foco operacional"
            meta={
              hasReview
                ? "Há revisão pendente. Decida quando trocar para uma interface mais limpa."
                : reviewState?.pending
                  ? "Há revisão semanal pendente. Feche o ciclo antes de abrir nova semana."
                  : "Use quando quiser executar com menos ruído."
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

      {operationsOpen ? (
        <OperationsSheet
          formOpen={operationFormOpen}
          form={operationForm}
          loading={operationLoading}
          operations={operations}
          onClose={() => setOperationsOpen(false)}
          onToggleForm={() => setOperationFormOpen((current) => !current)}
          onFieldChange={updateOperationField}
          onToggleWeekday={toggleOperationWeekday}
          onSubmit={createOperation}
          onCloseOperation={closeOperation}
        />
      ) : null}

      {soldierConfirmOpen ? (
        <ActivateSoldierDialog
          loading={activatingSoldier}
          todayMissions={todayMissions}
          onCancel={() => setSoldierConfirmOpen(false)}
          onConfirm={activateSoldier}
        />
      ) : null}
    </TacticalScreen>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  prioritySummary: {
    alignItems: "center",
    backgroundColor: theme.colors.purpleWash,
    borderColor: theme.colors.purpleBorder,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  priorityLabel: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    fontSize: 9,
  },
  priorityValue: {
    color: theme.colors.neonPurple,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 23,
  },
  priorityText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    flexShrink: 1,
    textAlign: "right",
  },
  ordersPanel: {
    marginTop: theme.spacing.md,
  },
  missionGroups: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
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
  transitionPanel: {
    marginTop: theme.spacing.md,
  },
});
