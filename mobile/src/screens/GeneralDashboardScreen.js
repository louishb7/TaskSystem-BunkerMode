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
    return "Não foi possível conectar à API.";
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
      {/* Direção escolhida: Posto Operacional.
          A tela prioriza prontidão e ordens antes de relatórios.
          Isso reduz leitura de dashboard e reforça o papel do General como comando. */}
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
        <Text style={styles.title}>POSTO DO GENERAL</Text>
        <Text style={styles.caption}>Visão. Plano. Estratégia.</Text>
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
              { label: "Revisão", value: counts.review },
            ]}
          />
        </SectionBlock>

        <SectionBlock label="HISTÓRICO / REVISÃO" meta={counts.review ? `${counts.review} PENDENTE` : "LIMPO"}>
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

        <SectionBlock label="MONTANHA">
          <TacticalPanel muted style={styles.mountainPanel}>
            <View style={styles.mountainPath}>
              <MountainStep label="SONHO" text="Direção" />
              <View style={styles.pathLine} />
              <MountainStep label="OBJETIVOS" text="Plano" />
              <View style={styles.pathLine} />
              <MountainStep label="MISSÕES" text="Execução" active />
            </View>
          </TacticalPanel>
        </SectionBlock>

        <SectionBlock label="RELATÓRIO SEMANAL">
          {report ? (
            <ReportSummary report={report} />
          ) : (
            <StatusNotice type="info" message="Nenhum dado disponível." />
          )}
        </SectionBlock>
      </ScrollView>

      <Pressable onPress={openCreateForm} style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

function MountainStep({ active = false, label, text }) {
  return (
    <View style={styles.mountainStep}>
      <Text style={[styles.mountainTitle, active && styles.mountainTitleActive]}>{label}</Text>
      <Text style={styles.mountainText}>{text}</Text>
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
  mountainPanel: {
    padding: spacing.md,
  },
  mountainPath: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mountainTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  mountainTitleActive: {
    color: colors.red,
  },
  mountainText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  mountainStep: {
    flex: 1,
  },
  pathLine: {
    backgroundColor: colors.borderStrong,
    height: 1,
    marginHorizontal: spacing.sm,
    width: 18,
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
