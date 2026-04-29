import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import EmptyState from "../components/EmptyState";
import GeneralMissionCard from "../components/GeneralMissionCard";
import ReportSummary from "../components/ReportSummary";
import ReviewCard from "../components/ReviewCard";
import StatusNotice from "../components/StatusNotice";
import MissionFormScreen from "./MissionFormScreen";
import { isOperationalMission } from "../utils/missionStatus";
import { colors, layout, radius, spacing, typography } from "../styles/tokens";

function getErrorMessage(result, fallback) {
  if (result?.status === 0) {
    return "Nao foi possivel conectar a API.";
  }
  return result?.data?.detail || fallback;
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formMission, setFormMission] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

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
      nextError = getErrorMessage(missionsResult, "Nao foi possivel carregar missoes.");
    }

    if (reviewResult.ok) {
      setReviewMissions(reviewResult.data);
    } else if (!nextError) {
      nextError = getErrorMessage(reviewResult, "Nao foi possivel carregar revisoes.");
    }

    if (reportResult.ok) {
      setReport(reportResult.data);
    } else if (!nextError) {
      nextError = getErrorMessage(reportResult, "Nao foi possivel carregar relatorio.");
    }

    setError(nextError);
  }

  async function activateSoldier() {
    const result = await api.setSessionMode(token, { mode: "soldier" });
    if (await handleUnauthorized(result)) {
      return;
    }
    if (!result.ok) {
      setError(getErrorMessage(result, "Nao foi possivel ativar o Soldado."));
      return;
    }

    const userResult = await api.getCurrentUser(token);
    if (await handleUnauthorized(userResult)) {
      return;
    }
    if (!userResult.ok) {
      setError(getErrorMessage(userResult, "Nao foi possivel recarregar o usuario."));
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
      setError(getErrorMessage(result, "Nao foi possivel alternar decisao."));
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
      setError(getErrorMessage(result, "Nao foi possivel remover a missao."));
    }
    await loadAll();
  }

  if (showForm) {
    return (
      <MissionFormScreen
        token={token}
        user={user}
        mission={formMission}
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
        <ActivityIndicator color={colors.amber} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.brand}>BUNKERMODE</Text>
          <View style={styles.generalBadge}>
            <Text style={styles.generalBadgeText}>GENERAL</Text>
          </View>
        </View>
        <Text style={styles.title}>Posto do General</Text>
        <Text style={styles.caption}>General: {user?.nome_general || user?.usuario || "General"}</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={activateSoldier} style={styles.soldierButton}>
            <Text style={styles.soldierButtonText}>ATIVAR SOLDADO</Text>
          </Pressable>
          <Pressable onPress={onLogout}>
            <Text style={styles.logout}>SAIR</Text>
          </Pressable>
        </View>
      </View>

      <StatusNotice type="error" message={error} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.stats}>
          <Metric label="Total" value={counts.total} />
          <Metric label="Pendentes" value={counts.pending} />
          <Metric label="Em revisao" value={counts.review} />
        </View>

        {reviewMissions.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.reviewLabel}>AGUARDANDO REVISAO</Text>
            {reviewMissions.map((mission, index) => (
              <ReviewCard
                key={String(mission?.id ?? index)}
                mission={mission}
                token={token}
                onLogout={onLogout}
                onReload={() => loadAll()}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ORDENS ATIVAS</Text>
          {missions.length > 0 ? (
            missions.map((mission, index) => (
              <GeneralMissionCard
                key={String(mission?.id ?? index)}
                mission={mission}
                togglingId={togglingId}
                onDelete={deleteMission}
                onEdit={openEditForm}
                onToggleDecision={toggleDecision}
              />
            ))
          ) : (
            <EmptyState />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RELATORIO SEMANAL</Text>
          {report ? (
            <ReportSummary report={report} />
          ) : (
            <StatusNotice type="info" message="Nenhum dado disponivel." />
          )}
        </View>
      </ScrollView>

      <Pressable onPress={openCreateForm} style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.bg,
    justifyContent: "center",
  },
  header: {
    backgroundColor: colors.bg,
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
    padding: spacing.screenH,
  },
  headerTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    ...typography.label,
    color: colors.amber,
  },
  generalBadge: {
    borderColor: colors.amber,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  generalBadgeText: {
    ...typography.small,
    color: colors.amber,
    fontWeight: "700",
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  soldierButton: {
    alignItems: "center",
    backgroundColor: colors.amber,
    borderRadius: radius.md,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  soldierButtonText: {
    ...typography.label,
    color: colors.bg,
    fontWeight: "700",
  },
  logout: {
    color: colors.textMuted,
    fontSize: 12,
  },
  content: {
    padding: spacing.screenH,
    paddingBottom: spacing.xl + 64,
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  metricLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm + spacing.xs,
  },
  reviewLabel: {
    ...typography.label,
    color: colors.amber,
    marginBottom: spacing.sm + spacing.xs,
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: radius.pill,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  fabText: {
    color: colors.bg,
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 32,
  },
});
