import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

import { api } from "../api/client";
import GeneralAssetBackground from "../components/general/GeneralAssetBackground";
import GeneralCommandHeader from "../components/general/GeneralCommandHeader";
import GeneralDayActionPanel from "../components/general/GeneralDayActionPanel";
import GeneralReviewDock from "../components/general/GeneralReviewDock";
import GeneralTransitionPanel from "../components/general/GeneralTransitionPanel";
import OperationalOrdersBoard from "../components/general/OperationalOrdersBoard";
import WeeklyPlanningBoard from "../components/general/WeeklyPlanningBoard";
import StatusNotice from "../components/StatusNotice";
import MissionFormScreen from "./MissionFormScreen";
import { generalTheme } from "../styles/generalTheme";
import { spacing } from "../styles/tokens";

const commandColors = generalTheme.colors;

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
  return `${formatShortDate(weekDays[0])} - ${formatShortDate(weekDays[6])}`;
}

export default function GeneralDashboardScreen({
  token,
  user,
  onLogout,
  onUserChange,
}) {
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

  const selectedMissions = useMemo(
    () => missions.filter((mission) => normalizePrazo(mission?.prazo) === selectedDateApi),
    [missions, selectedDateApi]
  );

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
      nextError = getErrorMessage(reviewResult, "Não foi possível carregar revisões.");
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

    if (await handleUnauthorized(result)) {
      setTogglingId(null);
      return;
    }
    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível alternar a decisão."));
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
        tone={formMission ? "default" : "command"}
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
        <GeneralAssetBackground />
        <ActivityIndicator color={commandColors.accentDark} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GeneralAssetBackground />
      <GeneralCommandHeader
        generalName={user?.nome_general || user?.usuario || "General"}
        onLogout={onLogout}
        weekLabel={weekLabel}
      />

      <StatusNotice type="error" message={error} tone="command" />

      <ScrollView contentContainerStyle={styles.content}>
        <WeeklyPlanningBoard
          onSelectDate={(date) => setSelectedDate(startOfDay(date))}
          selectedDate={selectedDate}
          todayDate={todayDate}
          weekDays={weekDays}
        />

        <GeneralDayActionPanel
          onCreate={openCreateForm}
          onToggleReview={() => setShowReviews((current) => !current)}
          reviewCount={reviewMissions.length}
          reviewOpen={showReviews}
        />

        {showReviews ? (
          <GeneralReviewDock
            missions={reviewMissions}
            onLogout={onLogout}
            onReload={() => loadAll()}
            token={token}
          />
        ) : null}

        <OperationalOrdersBoard
          missions={selectedMissions}
          onDelete={deleteMission}
          onEdit={openEditForm}
          onToggleDecision={toggleDecision}
          togglingId={togglingId}
        />

        <GeneralTransitionPanel
          hasReview={hasReview}
          loading={activatingSoldier}
          onActivate={activateSoldier}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: commandColors.canvas,
    flex: 1,
  },
  loading: {
    alignItems: "center",
    backgroundColor: commandColors.canvas,
    flex: 1,
    justifyContent: "center",
  },
  content: {
    padding: spacing.screenH,
    paddingBottom: spacing.xl,
  },
});
