import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "../api/client";
import EmptyState from "../components/EmptyState";
import Header from "../components/Header";
import MissionCard from "../components/MissionCard";
import StatusNotice from "../components/StatusNotice";
import { saveUser } from "../storage/sessionStorage";
import { colors, layout, spacing, typography } from "../styles/tokens";

function getErrorMessage(result, fallback) {
  return result?.data?.detail || fallback;
}

export default function SoldierHomeScreen({ token, user, onLogout, onUserChange }) {
  const [missions, setMissions] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    enterSoldierModeAndLoad();
  }, [token]);

  async function handleUnauthorized(result) {
    if (result.status === 401) {
      await onLogout();
      return true;
    }
    return false;
  }

  async function enterSoldierModeAndLoad() {
    setInitialLoading(true);
    setError("");

    if (user?.active_mode !== "soldier") {
      const modeResult = await api.activateSoldierMode(token);
      if (await handleUnauthorized(modeResult)) {
        return;
      }

      if (!modeResult.ok) {
        setError(getErrorMessage(modeResult, "Nao foi possivel ativar o modo Soldado."));
        setInitialLoading(false);
        return;
      }

      await saveUser(modeResult.data);
      onUserChange(modeResult.data);
    }

    await loadMissions({ initial: true });
  }

  async function loadMissions({ initial = false } = {}) {
    if (initial) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }

    const result = await api.listOperationalMissions(token);
    setInitialLoading(false);
    setRefreshing(false);

    if (await handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setError(getErrorMessage(result, "Nao foi possivel carregar as ordens."));
      return;
    }

    setMissions(result.data);
    setError("");
  }

  async function handleComplete(missionId) {
    const result = await api.completeMission(token, missionId);

    if (await handleUnauthorized(result)) {
      return { ok: false, error: "" };
    }

    if (!result.ok) {
      await loadMissions();
      return {
        ok: false,
        error: getErrorMessage(result, "Nao foi possivel concluir a missao."),
      };
    }

    await loadMissions();
    return { ok: true };
  }

  async function handleJustify(missionId, reason) {
    if (!reason) {
      return { ok: false, error: "Informe a justificativa antes de continuar." };
    }

    const result = await api.submitJustification(token, missionId, reason);

    if (await handleUnauthorized(result)) {
      return { ok: false, error: "" };
    }

    if (!result.ok) {
      await loadMissions();
      return {
        ok: false,
        error: getErrorMessage(result, "Nao foi possivel enviar a justificativa."),
      };
    }

    await loadMissions();
    return { ok: true };
  }

  if (initialLoading) {
    return (
      <View style={styles.initial}>
        <ActivityIndicator color={colors.amber} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        missionCount={missions.length}
        refreshing={refreshing}
        user={user}
        onLogout={onLogout}
        onRefresh={() => loadMissions()}
      />

      <View style={styles.listZone}>
        <Text style={styles.sectionLabel}>ORDENS DO DIA</Text>
        <StatusNotice type="error" message={error} />
        <FlatList
          contentContainerStyle={styles.listContent}
          data={missions}
          keyExtractor={(item, index) => String(item?.id ?? index)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.amber}
              onRefresh={() => loadMissions()}
            />
          }
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <MissionCard mission={item} onComplete={handleComplete} onJustify={handleJustify} />
          )}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>O General ja decidiu. Execute.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  initial: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.bg,
    justifyContent: "center",
  },
  listZone: {
    flex: 1,
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm + spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  footer: {
    alignItems: "center",
    backgroundColor: colors.bg,
    borderTopColor: colors.bgElevated,
    borderTopWidth: 1,
    height: layout.footerHeight,
    justifyContent: "center",
    paddingHorizontal: spacing.screenH,
  },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: "italic",
    textAlign: "center",
  },
});
