import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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

const operationWeekdays = [
  { value: 0, label: "SEG" },
  { value: 1, label: "TER" },
  { value: 2, label: "QUA" },
  { value: 3, label: "QUI" },
  { value: 4, label: "SEX" },
  { value: 5, label: "SÁB" },
  { value: 6, label: "DOM" },
];

const initialOperationForm = {
  nome: "",
  descricao: "",
  start_date: "",
  end_date: "",
  weekdays: [],
  ordem_titulo: "",
  ordem_instrucao: "",
  is_decided: false,
};

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

function isFailureMission(mission) {
  return String(mission?.status_code || "").startsWith("FALHA");
}

function groupMissions(missions) {
  return {
    critical: missions.filter((mission) => !isCompleted(mission) && mission?.is_decided === true),
    pending: missions.filter((mission) => !isCompleted(mission) && mission?.is_decided !== true && !isFailureMission(mission)),
    failures: missions.filter((mission) => !isCompleted(mission) && isFailureMission(mission)),
    completed: missions.filter(isCompleted),
  };
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
  const [operations, setOperations] = useState([]);
  const [operationFormOpen, setOperationFormOpen] = useState(false);
  const [operationForm, setOperationForm] = useState(initialOperationForm);
  const [operationLoading, setOperationLoading] = useState(false);
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
  const materializedWeekRef = useRef("");

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
  const missionGroups = useMemo(() => groupMissions(selectedMissions), [selectedMissions]);

  useEffect(() => {
    if (!token || !weekDays.length) {
      return;
    }
    const startDate = formatDateForApi(weekDays[0]);
    const endDate = formatDateForApi(weekDays[weekDays.length - 1]);
    const key = `${startDate}:${endDate}`;
    if (materializedWeekRef.current === key) {
      return;
    }
    materializedWeekRef.current = key;
    api.materializeOperations(token, { start_date: startDate, end_date: endDate }).then(async (result) => {
      if (await handleUnauthorized(result)) {
        return;
      }
      await loadAll();
    });
  }, [token, weekLabel]);

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
    ] = await Promise.all([
      api.listMissions(token),
      api.listReviewMissions(token),
      api.listHistoricalMissions(token),
      api.getReviewState(token),
      api.listWeeklyReviews(token),
      api.listOperations(token),
    ]);

    setInitialLoading(false);
    setRefreshing(false);

    for (const result of [missionsResult, reviewResult, historicalResult, reviewStateResult, weeklyReviewsResult, operationsResult]) {
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

    if (operationsResult.ok) {
      setOperations(Array.isArray(operationsResult.data) ? operationsResult.data : []);
    } else if (!nextError) {
      nextError = getErrorMessage(operationsResult, "Não foi possível carregar operações.");
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
      descricao: operationForm.descricao || null,
      ordem_instrucao: operationForm.ordem_instrucao || null,
    });
    setOperationLoading(false);

    if (await handleUnauthorized(result)) {
      return;
    }
    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível registrar a operação."));
      return;
    }
    setOperationForm(initialOperationForm);
    setOperationFormOpen(false);
    materializedWeekRef.current = "";
    await loadAll();
  }

  async function closeOperation(operationId) {
    setError("");
    setOperationLoading(true);
    const result = await api.closeOperation(token, operationId);
    setOperationLoading(false);

    if (await handleUnauthorized(result)) {
      return;
    }
    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível encerrar a operação."));
      return;
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
                  ? selectedRemainingCount === 1
                    ? "1 ordem ainda resiste à caçada."
                    : `${selectedRemainingCount} ordens ainda resistem à caçada.`
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
                label="Inegociáveis"
                missions={missionGroups.critical}
                onDelete={deleteMission}
                onEdit={openEditForm}
                onToggleDecision={toggleDecision}
                togglingId={togglingId}
                tone="critical"
              />
              <MissionGroup
                label="Pendentes"
                missions={missionGroups.pending}
                onDelete={deleteMission}
                onEdit={openEditForm}
                onToggleDecision={toggleDecision}
                togglingId={togglingId}
              />
              <MissionGroup
                label="Falhas em leitura"
                missions={missionGroups.failures}
                onDelete={deleteMission}
                onEdit={openEditForm}
                onToggleDecision={toggleDecision}
                togglingId={togglingId}
                tone="danger"
              />
              <MissionGroup
                label="Cumpridas"
                missions={missionGroups.completed}
                onDelete={deleteMission}
                onEdit={openEditForm}
                onToggleDecision={toggleDecision}
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

        <TacticalPanel style={styles.operationsPanel}>
          <SectionHeader
            eyebrow="OPERAÇÕES"
            title="Plano em período fechado"
            meta="Ordens geradas por operação aparecem no quadro do dia e no Soldado."
          />
          <Pressable
            disabled={operationLoading}
            onPress={() => setOperationFormOpen((current) => !current)}
            style={styles.operationAction}
          >
            <Text style={styles.operationActionText}>
              {operationFormOpen ? "FECHAR OPERAÇÃO" : "NOVA OPERAÇÃO"}
            </Text>
          </Pressable>
          {operationFormOpen ? (
            <View style={styles.operationForm}>
              <TextInput
                onChangeText={(value) => updateOperationField("nome", value)}
                placeholder="NOME DA OPERAÇÃO"
                placeholderTextColor={theme.colors.textDim}
                style={styles.operationInput}
                value={operationForm.nome}
              />
              <TextInput
                onChangeText={(value) => updateOperationField("descricao", value)}
                placeholder="DIRETIVA OPCIONAL"
                placeholderTextColor={theme.colors.textDim}
                style={styles.operationInput}
                value={operationForm.descricao}
              />
              <View style={styles.operationDateRow}>
                <TextInput
                  onChangeText={(value) => updateOperationField("start_date", value)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textDim}
                  style={[styles.operationInput, styles.operationDateInput]}
                  value={operationForm.start_date}
                />
                <TextInput
                  onChangeText={(value) => updateOperationField("end_date", value)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textDim}
                  style={[styles.operationInput, styles.operationDateInput]}
                  value={operationForm.end_date}
                />
              </View>
              <View style={styles.operationWeekdayGrid}>
                {operationWeekdays.map((day) => (
                  <Pressable
                    key={day.value}
                    onPress={() => toggleOperationWeekday(day.value)}
                    style={[
                      styles.operationWeekday,
                      operationForm.weekdays.includes(day.value) && styles.operationWeekdaySelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.operationWeekdayText,
                        operationForm.weekdays.includes(day.value) && styles.operationWeekdayTextSelected,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                onChangeText={(value) => updateOperationField("ordem_titulo", value)}
                placeholder="ORDEM DIÁRIA"
                placeholderTextColor={theme.colors.textDim}
                style={styles.operationInput}
                value={operationForm.ordem_titulo}
              />
              <TextInput
                onChangeText={(value) => updateOperationField("ordem_instrucao", value)}
                placeholder="INSTRUÇÃO OPCIONAL"
                placeholderTextColor={theme.colors.textDim}
                style={styles.operationInput}
                value={operationForm.ordem_instrucao}
              />
              <Pressable
                onPress={() => updateOperationField("is_decided", !operationForm.is_decided)}
                style={[
                  styles.operationDecision,
                  operationForm.is_decided && styles.operationDecisionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.operationDecisionText,
                    operationForm.is_decided && styles.operationDecisionTextSelected,
                  ]}
                >
                  {operationForm.is_decided ? "DECIDIDA ATIVA" : "MARCAR COMO DECIDIDA"}
                </Text>
              </Pressable>
              <Pressable
                disabled={operationLoading}
                onPress={createOperation}
                style={[styles.operationPrimary, operationLoading && styles.operationDisabled]}
              >
                <Text style={styles.operationPrimaryText}>
                  {operationLoading ? "REGISTRANDO" : "REGISTRAR OPERAÇÃO"}
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.operationRows}>
            {operations.length > 0 ? (
              operations.slice(0, 4).map((operation) => (
                <View key={String(operation.id)} style={styles.operationRow}>
                  <View style={styles.operationInfo}>
                    <Text numberOfLines={1} style={styles.operationName}>{operation.nome}</Text>
                    <Text numberOfLines={1} style={styles.operationMeta}>
                      {operation.status === "ativa" ? "ATIVA" : "ENCERRADA"} | {operation.ordem_titulo}
                    </Text>
                  </View>
                  {operation.status === "ativa" ? (
                    <Pressable
                      disabled={operationLoading}
                      onPress={() => closeOperation(operation.id)}
                      style={styles.operationClose}
                    >
                      <Text style={styles.operationCloseText}>ENCERRAR</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.operationEmpty}>Nenhuma operação registrada.</Text>
            )}
          </View>
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

function MissionGroup({
  label,
  missions,
  onDelete,
  onEdit,
  onToggleDecision,
  togglingId,
  tone = "",
}) {
  if (!missions.length) {
    return null;
  }

  return (
    <View style={styles.missionGroup}>
      <View style={styles.missionGroupHeader}>
        <Text style={[
          styles.missionGroupLabel,
          tone === "critical" && styles.missionGroupCritical,
          tone === "danger" && styles.missionGroupDanger,
          tone === "completed" && styles.missionGroupCompleted,
        ]}>
          {label}
        </Text>
        <Text style={styles.missionGroupCount}>{missions.length}</Text>
      </View>
      <View style={[styles.missionList, tone === "completed" && styles.completedMissionList]}>
        {missions.map((mission, index) => (
          <MissionCard
            key={String(mission?.id ?? index)}
            mission={mission}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggleDecision={onToggleDecision}
            toggling={togglingId === mission?.id}
            variant="general"
          />
        ))}
      </View>
    </View>
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
  operationsPanel: {
    marginTop: theme.spacing.md,
  },
  operationAction: {
    alignItems: "center",
    borderColor: theme.colors.fireBorder,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: theme.spacing.md,
    minHeight: 42,
  },
  operationActionText: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  operationForm: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  operationInput: {
    ...theme.typography.body,
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 42,
    paddingHorizontal: theme.spacing.sm,
  },
  operationDateRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  operationDateInput: {
    flex: 1,
  },
  operationWeekdayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  operationWeekday: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    minHeight: 34,
    minWidth: 42,
    justifyContent: "center",
  },
  operationWeekdaySelected: {
    borderColor: theme.colors.fireBorder,
  },
  operationWeekdayText: {
    ...theme.typography.small,
    color: theme.colors.textDim,
  },
  operationWeekdayTextSelected: {
    color: theme.colors.fire,
  },
  operationDecision: {
    alignItems: "center",
    borderColor: theme.colors.purpleBorder,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
  },
  operationDecisionSelected: {
    backgroundColor: theme.colors.purpleWash,
  },
  operationDecisionText: {
    ...theme.typography.small,
    color: theme.colors.textDim,
  },
  operationDecisionTextSelected: {
    color: theme.colors.neonPurple,
  },
  operationPrimary: {
    alignItems: "center",
    backgroundColor: theme.colors.fire,
    borderRadius: theme.radius.sm,
    justifyContent: "center",
    minHeight: 46,
  },
  operationDisabled: {
    opacity: 0.62,
  },
  operationPrimaryText: {
    ...theme.typography.label,
    color: theme.colors.black,
  },
  operationRows: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  operationRow: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
    padding: theme.spacing.sm,
  },
  operationInfo: {
    flex: 1,
    minWidth: 0,
  },
  operationName: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  operationMeta: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    marginTop: 2,
  },
  operationEmpty: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  operationClose: {
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  operationCloseText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  missionList: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  missionGroups: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  missionGroup: {
    gap: theme.spacing.sm,
  },
  missionGroupHeader: {
    alignItems: "center",
    borderBottomColor: theme.colors.borderSoft,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: theme.spacing.xs,
  },
  missionGroupLabel: {
    ...theme.typography.small,
    color: theme.colors.textDim,
  },
  missionGroupCritical: {
    color: theme.colors.neonPurple,
  },
  missionGroupDanger: {
    color: theme.colors.red,
  },
  missionGroupCompleted: {
    color: theme.colors.success,
  },
  missionGroupCount: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  completedMissionList: {
    marginTop: 0,
    opacity: 0.82,
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
