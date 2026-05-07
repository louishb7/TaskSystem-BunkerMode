import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../api/client";
import BrandSymbol from "../components/BrandSymbol";
import CommandActionDock from "../components/CommandActionDock";
import DaySelector from "../components/DaySelector";
import EmptyState from "../components/EmptyState";
import GeneralHeader from "../components/GeneralHeader";
import MissionCard, { MissionProgress } from "../components/MissionCard";
import ModeSwitchButton from "../components/ModeSwitchButton";
import ReviewPanel from "../components/ReviewPanel";
import SectionHeader from "../components/SectionHeader";
import StatusNotice from "../components/StatusNotice";
import TacticalPanel from "../components/TacticalPanel";
import TacticalScreen from "../components/TacticalScreen";
import MissionFormScreen from "./MissionFormScreen";
import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

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

export default function GeneralDashboardScreen({
  token,
  user,
  onLogout,
  onUserChange,
}) {
  const insets = useSafeAreaInsets();
  const [missions, setMissions] = useState([]);
  const [reviewMissions, setReviewMissions] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formMission, setFormMission] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [activatingSoldier, setActivatingSoldier] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [showReviews, setShowReviews] = useState(false);

  useEffect(() => {
    loadAll({ initial: true });
  }, [token]);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const weekLabel = formatWeekLabel(weekDays);
  const selectedDateApi = formatDateForApi(selectedDate);
  const todayDate = useMemo(() => startOfDay(new Date()), []);
  const hasReview = reviewMissions.length > 0;
  const selectedDateLabel = formatSelectedDate(selectedDate);

  const selectedMissions = useMemo(
    () => missions.filter((mission) => normalizePrazo(mission?.prazo) === selectedDateApi),
    [missions, selectedDateApi]
  );

  const missionCountsByDate = useMemo(() => {
    const counts = {};
    missions.forEach((mission) => {
      const key = normalizePrazo(mission?.prazo);
      if (!key) {
        return;
      }
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [missions]);

  const selectedCompletedCount = useMemo(
    () => selectedMissions.filter((mission) => mission?.status_code === "CONCLUIDA").length,
    [selectedMissions]
  );
  const selectedRemainingCount = Math.max(0, selectedMissions.length - selectedCompletedCount);

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

    const [missionsResult, reviewResult] = await Promise.all([
      api.listMissions(token),
      api.listReviewMissions(token),
    ]);

    setInitialLoading(false);
    setRefreshing(false);

    for (const result of [missionsResult, reviewResult]) {
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
      nextError = getErrorMessage(reviewResult, "Não foi possível carregar pós-ação.");
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
          <ActivityIndicator color={theme.colors.red} />
          <Text style={styles.loadingText}>SINCRONIZANDO COMANDO</Text>
        </View>
      </TacticalScreen>
    );
  }

  return (
    <TacticalScreen variant="general">
      <GeneralHeader
        generalName={user?.nome_general || user?.usuario || "General"}
        onLogout={onLogout}
        weekLabel={weekLabel}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <TacticalPanel elevated style={styles.calendarPanel}>
          <SectionHeader
            eyebrow="QUADRO OPERACIONAL"
            title="A semana na parede"
            meta="Cada marca é um dia de caça. Escolha onde o General dará ordens."
          />
          <DaySelector
            missionCountsByDate={missionCountsByDate}
            onSelectDate={(date) => setSelectedDate(startOfDay(date))}
            selectedDate={selectedDate}
            todayDate={todayDate}
            weekDays={weekDays}
          />
        </TacticalPanel>

        <StatusNotice type="error" message={error} />

        <TacticalPanel elevated style={styles.lionPanel}>
          <View style={styles.lionTop}>
            <View style={styles.lionSignal} />
            <View style={styles.lionCopy}>
              <Text style={styles.lionEyebrow}>LEÃO DO DIA</Text>
              <Text style={styles.lionTitle}>{selectedDateLabel}</Text>
            </View>
            <View style={styles.lionCounter}>
              <Text style={styles.lionCounterValue}>{selectedRemainingCount}</Text>
              <Text style={styles.lionCounterLabel}>RESTAM</Text>
            </View>
          </View>
          <Text style={styles.lionBrief}>
            {selectedMissions.length === 1
              ? "1 ordem para matar o leão do dia."
              : `${selectedMissions.length} ordens para matar o leão do dia.`}
          </Text>
          <MissionProgress label="CAÇADA" missions={selectedMissions} />
        </TacticalPanel>

        <TacticalPanel style={styles.ordersPanel}>
          <SectionHeader
            eyebrow="ORDENS DO DIA"
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
            <Text style={styles.createKicker}>DIA SELECIONADO</Text>
            <Text style={styles.createText}>NOVA ORDEM CONTRA O LEÃO</Text>
          </Pressable>
        </TacticalPanel>

        {showReviews ? (
          <ReviewPanel
            missions={reviewMissions}
            onLogout={onLogout}
            onReload={() => loadAll()}
            token={token}
          />
        ) : null}

        <TacticalPanel style={styles.transitionPanel}>
          <SectionHeader
            eyebrow="TRANSIÇÃO DE MODO"
            title="Entregar ordens ao Soldado"
            meta={
              hasReview
                ? "Há revisão pendente. Decida quando entrar no protocolo de execução."
                : "Ative somente quando o plano estiver pronto para ser executado."
            }
          />
          <ModeSwitchButton
            loading={activatingSoldier}
            mode="general"
            onPress={activateSoldier}
          />
        </TacticalPanel>
      </ScrollView>
      <CommandActionDock
        active={showReviews}
        bottomOffset={Math.max(insets.bottom, 20) + 72}
        count={reviewMissions.length}
        onPress={() => setShowReviews((value) => !value)}
      />
    </TacticalScreen>
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
    paddingBottom: theme.spacing.xxl + 80,
  },
  calendarPanel: {
    marginBottom: theme.spacing.md,
  },
  lionPanel: {
    backgroundColor: "rgba(35,30,23,0.9)",
    borderColor: "rgba(182,138,58,0.32)",
    marginTop: theme.spacing.md,
  },
  lionTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  lionSignal: {
    backgroundColor: theme.colors.red,
    height: 46,
    width: 4,
  },
  lionCopy: {
    flex: 1,
    minWidth: 0,
  },
  lionEyebrow: {
    ...theme.typography.small,
    color: theme.colors.red,
  },
  lionTitle: {
    ...theme.typography.heading,
    color: theme.colors.white,
    fontSize: 21,
    marginTop: 2,
  },
  lionCounter: {
    alignItems: "center",
    backgroundColor: "rgba(18,15,12,0.72)",
    borderColor: "rgba(245,240,232,0.16)",
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
    marginBottom: theme.spacing.md,
  },
  createButton: {
    backgroundColor: "rgba(91,53,36,0.82)",
    borderColor: theme.colors.amber,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: theme.spacing.md,
    minHeight: 54,
    paddingHorizontal: theme.spacing.md,
  },
  createKicker: {
    ...theme.typography.small,
    color: theme.colors.textDim,
  },
  createText: {
    ...theme.typography.label,
    color: theme.colors.text,
    fontSize: 14,
    marginTop: 2,
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
});
