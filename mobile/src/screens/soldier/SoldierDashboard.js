import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../api/client";
import BrandSymbol from "../../components/BrandSymbol";
import EmptyState from "../../components/EmptyState";
import MissionCard, { MissionProgress } from "../../components/MissionCard";
import ModeSwitchButton from "../../components/ModeSwitchButton";
import SoldierHeader from "../../components/SoldierHeader";
import StatusNotice from "../../components/StatusNotice";
import TacticalPanel from "../../components/TacticalPanel";
import TacticalScreen from "../../components/TacticalScreen";
import { bunkerTheme as theme } from "../../theme/bunkermodeTheme";
import { STATUS } from "../../utils/missionStatus";

function getErrorMessage(result, fallback) {
  if (result?.status === 0) {
    return "Não foi possível conectar à API.";
  }
  return result?.data?.detail || fallback;
}

function formatCurrentDay() {
  try {
    return new Date()
      .toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      })
      .toUpperCase();
  } catch {
    return "HOJE";
  }
}

export default function SoldierDashboard({ token, onLogout, onUserChange }) {
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const [missions, setMissions] = useState([]);
  const [dailyMissions, setDailyMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);
  const [justifyingId, setJustifyingId] = useState(null);
  const [returningToCommand, setReturningToCommand] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    loadMissions({ initial: true });
  }, [token]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const actionMissions = useMemo(
    () =>
      missions.filter(
        (mission) =>
          (mission?.status_code === STATUS.PENDENTE &&
            mission?.permissions?.can_complete === true) ||
          mission?.permissions?.can_justify === true
      ),
    [missions]
  );

  async function handleUnauthorized(result) {
    if (result?.status === 401) {
      await onLogout();
      return true;
    }
    return false;
  }

  async function reloadUser(expectedMode = null) {
    const result = await api.getCurrentUser(token);
    if (await handleUnauthorized(result)) {
      return false;
    }
    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível recarregar o usuário."));
      return false;
    }
    if (expectedMode && result.data?.active_mode !== expectedMode) {
      setError("Modo ativo não confirmado pelo servidor.");
      return false;
    }
    await onUserChange(result.data);
    return true;
  }

  async function loadMissions({ initial = false } = {}) {
    if (initial) {
      setLoading(true);
    }

    const [result, dailyResult] = await Promise.all([
      api.listOperationalMissions(token),
      api.listDailyMissions(token),
    ]);
    setLoading(false);

    if (await handleUnauthorized(result) || await handleUnauthorized(dailyResult)) {
      return;
    }

    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível carregar ordens."));
      return;
    }

    setMissions(result.data);
    if (!dailyResult.ok) {
      setDailyMissions(result.data);
      setError(getErrorMessage(dailyResult, "Não foi possível carregar a caçada do dia."));
      return;
    }

    setDailyMissions(dailyResult.data);
    setError("");
  }

  async function completeMission(missionId) {
    setCompletingId(missionId);
    setError("");
    setNotice("");

    const result = await api.completeMission(token, missionId);
    setCompletingId(null);

    if (await handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível concluir a missão."));
      await loadMissions();
      return;
    }

    setNotice("EXECUTADO");
    await loadMissions();
  }

  async function justifyMission(missionId, payload) {
    setJustifyingId(missionId);
    setError("");
    setNotice("");

    const result = await api.submitFailureJustification(token, missionId, payload);
    setJustifyingId(null);

    if (await handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível registrar a justificativa."));
      await loadMissions();
      return;
    }

    setNotice("JUSTIFICATIVA REGISTRADA");
    await loadMissions();
  }

  async function returnToGeneral() {
    setReturningToCommand(true);
    setError("");
    setNotice("");

    const result = await api.setSessionMode(token, { mode: "general" });
    setReturningToCommand(false);

    if (await handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível retornar ao comando."));
      return;
    }

    const confirmed = await reloadUser("general");
    if (!confirmed) {
      await onUserChange(result.data);
    }
  }

  if (loading) {
    return (
      <TacticalScreen denseBackground variant="soldier">
        <View style={styles.loading}>
          <BrandSymbol size={82} />
          <Text style={styles.loadingTitle}>FOCO OPERACIONAL</Text>
          <Text style={styles.loadingText}>SINCRONIZANDO ORDENS</Text>
        </View>
      </TacticalScreen>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboard}
    >
      <TacticalScreen denseBackground variant="soldier">
        <View
          style={[
            styles.content,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              paddingTop: theme.spacing.md,
            },
          ]}
        >
          <SoldierHeader
            currentDay={formatCurrentDay()}
            remainingCount={actionMissions.length}
            totalCount={dailyMissions.length || missions.length || actionMissions.length}
          />

          <TacticalPanel style={styles.progressPanel}>
            <MissionProgress label="CAÇADA" missions={dailyMissions.length ? dailyMissions : missions} />
          </TacticalPanel>

          <View style={styles.notices}>
            <StatusNotice type="error" message={error} />
            <StatusNotice type="info" message={notice} />
          </View>

          {actionMissions.length > 0 ? (
            <View style={styles.focusLine}>
              <Text style={styles.focusLabel}>PRÓXIMA ORDEM</Text>
              <Text numberOfLines={1} style={styles.focusTitle}>
                {actionMissions[0]?.titulo || "Ordem sem título"}
              </Text>
            </View>
          ) : null}

          <FlatList
            contentContainerStyle={[
              styles.listContent,
              keyboardOpen && styles.listContentKeyboard,
            ]}
            data={actionMissions}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item, index) => String(item?.id ?? index)}
            ListEmptyComponent={
              <EmptyState
                title="Sem ordens pendentes"
                message="Nenhuma ordem operacional está disponível para execução agora."
              />
            }
            onScrollToIndexFailed={() => {}}
            ref={listRef}
            renderItem={({ item, index }) => (
              <MissionCard
                completing={completingId === item?.id}
                justifying={justifyingId === item?.id}
                mission={item}
                onComplete={() => completeMission(item?.id)}
                onInputFocus={() => {
                  setTimeout(() => {
                    listRef.current?.scrollToIndex?.({
                      animated: true,
                      index,
                      viewPosition: 0.16,
                    });
                  }, 120);
                }}
                onJustify={(payload) => justifyMission(item?.id, payload)}
                variant="soldier"
              />
            )}
            style={styles.list}
          />

          <View style={styles.footer}>
            <ModeSwitchButton
              disabled={returningToCommand}
              loading={returningToCommand}
              mode="soldier"
              onPress={returnToGeneral}
            />
          </View>
        </View>
      </TacticalScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.sm,
    justifyContent: "center",
  },
  loadingTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  loadingText: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
  },
  notices: {
    marginTop: theme.spacing.md,
  },
  focusLine: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.24)",
    borderColor: theme.colors.fireBorder,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  focusLabel: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  focusTitle: {
    ...theme.typography.label,
    color: theme.colors.text,
    flex: 1,
    textAlign: "right",
  },
  progressPanel: {
    borderColor: "rgba(255,138,42,0.22)",
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  listContentKeyboard: {
    paddingBottom: 180,
  },
  footer: {
    backgroundColor: "rgba(23,23,23,0.94)",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.sm,
  },
  disabled: {
    opacity: 0.45,
  },
});
