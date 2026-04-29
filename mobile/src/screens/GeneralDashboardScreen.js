import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import EmptyState from "../components/EmptyState";
import GeneralMissionCard from "../components/GeneralMissionCard";
import ModeSwitcher from "../components/ModeSwitcher";
import ProgressBlock from "../components/ProgressBlock";
import ReportSummary from "../components/ReportSummary";
import ReviewBlock from "../components/ReviewBlock";
import SectionBlock from "../components/SectionBlock";
import StatusNotice from "../components/StatusNotice";
import TacticalPanel from "../components/TacticalPanel";
import MissionFormScreen from "./MissionFormScreen";
import { isOperationalMission } from "../utils/missionStatus";
import { colors, radius, spacing, typography } from "../styles/tokens";

const logo = require("../assets/bunkermode/logo/logo_final_selected.png");

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
  const [activatingSoldier, setActivatingSoldier] = useState(false);

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
    setActivatingSoldier(true);
    const result = await api.setSessionMode(token, { mode: "soldier" });
    setActivatingSoldier(false);
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
        <ActivityIndicator color={colors.red} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brandLockup}>
            <Image resizeMode="contain" source={logo} style={styles.logo} />
            <Text style={styles.brand}>BUNKERMODE</Text>
          </View>
          <View style={styles.generalBadge}>
            <Text style={styles.generalBadgeText}>GENERAL</Text>
          </View>
        </View>
        <Text style={styles.title}>GENERAL</Text>
        <Text style={styles.caption}>Visao. Plano. Estrategia.</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={onLogout}>
            <Text style={styles.logout}>SAIR</Text>
          </Pressable>
        </View>
      </View>

      <StatusNotice type="error" message={error} />

      <ScrollView contentContainerStyle={styles.content}>
        <ModeSwitcher
          disabled={activatingSoldier}
          mode="general"
          onPress={activateSoldier}
          pending={activatingSoldier}
        />

        <SectionBlock label="ESTADO DO SISTEMA" meta={user?.nome_general || user?.usuario || "GENERAL"}>
          <ProgressBlock
            metrics={[
              { label: "Total", value: counts.total },
              { label: "Pendentes", value: counts.pending },
              { label: "Revisao", value: counts.review },
            ]}
          />
        </SectionBlock>

        <SectionBlock label="MONTANHA">
          <View style={styles.mountainGrid}>
            <TacticalPanel style={styles.mountainPanel}>
              <Text style={styles.mountainTitle}>DREAM</Text>
              <Text style={styles.mountainText}>Destino define direcao.</Text>
            </TacticalPanel>
            <TacticalPanel style={styles.mountainPanel}>
              <Text style={styles.mountainTitle}>OBJECTIVES</Text>
              <Text style={styles.mountainText}>Plano transforma decisao.</Text>
            </TacticalPanel>
            <TacticalPanel danger style={styles.mountainPanel}>
              <Text style={styles.mountainTitle}>MISSIONS</Text>
              <Text style={styles.mountainText}>Ordem pronta para execucao.</Text>
            </TacticalPanel>
          </View>
        </SectionBlock>

        <SectionBlock label="HISTORY / REVIEW" meta={counts.review ? `${counts.review} PENDENTE` : "LIMPO"}>
          <ReviewBlock
            missions={reviewMissions}
            token={token}
            onLogout={onLogout}
            onReload={() => loadAll()}
          />
        </SectionBlock>

        <SectionBlock label="ORDENS ATIVAS" meta={`${missions.length} REGISTROS`}>
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
        </SectionBlock>

        <SectionBlock label="RELATORIO SEMANAL">
          {report ? (
            <ReportSummary report={report} />
          ) : (
            <StatusNotice type="info" message="Nenhum dado disponivel." />
          )}
        </SectionBlock>
      </ScrollView>

      <Pressable onPress={openCreateForm} style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
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
    color: colors.textPrimary,
  },
  brandLockup: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  logo: {
    height: 34,
    width: 34,
  },
  generalBadge: {
    borderColor: colors.red,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  generalBadgeText: {
    ...typography.small,
    color: colors.red,
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
    justifyContent: "flex-end",
    marginTop: spacing.md,
  },
  logout: {
    color: colors.textMuted,
    fontSize: 12,
  },
  content: {
    padding: spacing.screenH,
    paddingBottom: spacing.xl + 64,
  },
  mountainGrid: {
    gap: spacing.sm,
  },
  mountainPanel: {
    padding: spacing.md,
  },
  mountainTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  mountainText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    alignItems: "center",
    backgroundColor: colors.red,
    borderColor: colors.red,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  fabText: {
    color: colors.black,
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 32,
  },
});
