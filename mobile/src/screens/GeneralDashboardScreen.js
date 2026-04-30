import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import EmptyState from "../components/EmptyState";
import GeneralMissionCard from "../components/GeneralMissionCard";
import ReportSummary from "../components/ReportSummary";
import ReviewBlock from "../components/ReviewBlock";
import StatusNotice from "../components/StatusNotice";
import MissionFormScreen from "./MissionFormScreen";
import { isOperationalMission } from "../utils/missionStatus";
import { radius, spacing, typography } from "../styles/tokens";

const logo = require("../assets/bunkermode/logo/logo_final_selected.png");

const commandColors = {
  accent: "#4E6B58",
  accentDark: "#2F4A3A",
  alert: "#A33A32",
  border: "#C8D0C3",
  borderStrong: "#AEB9AA",
  canvas: "#D8DED2",
  ink: "#20231F",
  muted: "#6F776D",
  panel: "#F7F8F2",
  panelMuted: "#EEF1E8",
  white: "#FBFCF7",
};

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
  const [, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formMission, setFormMission] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [activatingSoldier, setActivatingSoldier] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showPlanning, setShowPlanning] = useState(false);

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
        <ActivityIndicator color={commandColors.accentDark} />
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
        <Text style={styles.title}>POSTO DO GENERAL</Text>
        <Text style={styles.caption}>Ordens, revisão e prontidão para execução.</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={onLogout}>
            <Text style={styles.logout}>SAIR</Text>
          </Pressable>
        </View>
      </View>

      <StatusNotice type="error" message={error} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.commandPanel}>
          <View style={styles.commandHeader}>
            <View>
              <Text style={styles.commandKicker}>ESTADO OPERACIONAL</Text>
              <Text style={styles.commandTitle}>{counts.pending} ordens pendentes</Text>
            </View>
            <View style={[styles.reviewPill, counts.review > 0 && styles.reviewPillAlert]}>
              <Text style={[styles.reviewPillText, counts.review > 0 && styles.reviewPillTextAlert]}>
                {counts.review > 0 ? `${counts.review} revisão` : "Sem revisão"}
              </Text>
            </View>
          </View>
          <View style={styles.commandRows}>
            <CommandRow label="General" value={user?.nome_general || user?.usuario || "General"} />
            <CommandRow label="Registros" value={String(counts.total)} />
            <CommandRow label="Próxima ação" value={counts.review > 0 ? "Revisar falhas" : "Preparar ordens"} />
          </View>
          <Pressable
            disabled={activatingSoldier}
            onPress={activateSoldier}
            style={[styles.soldierButton, activatingSoldier && styles.disabledButton]}
          >
            {activatingSoldier ? (
              <ActivityIndicator color={commandColors.white} />
            ) : (
              <Text style={styles.soldierButtonText}>ATIVAR SOLDADO</Text>
            )}
          </Pressable>
        </View>

        <CommandSection
          label="Pendências de revisão"
          meta={counts.review ? `${counts.review} pendente` : "limpo"}
          urgent={counts.review > 0}
        >
          <ReviewBlock
            missions={reviewMissions}
            tone="command"
            token={token}
            onLogout={onLogout}
            onReload={() => loadAll()}
          />
        </CommandSection>

        <CommandSection label="Ordens atuais" meta={`${missions.length} registros`}>
          {missions.length > 0 ? (
            missions.map((mission, index) => (
              <GeneralMissionCard
                key={String(mission?.id ?? index)}
                mission={mission}
                tone="command"
                togglingId={togglingId}
                onDelete={deleteMission}
                onEdit={openEditForm}
                onToggleDecision={toggleDecision}
              />
            ))
          ) : (
            <EmptyState tone="command" />
          )}
        </CommandSection>

        <View style={styles.drawerList}>
          <DrawerButton
            label="Abrir relatório semanal"
            open={showReport}
            onPress={() => setShowReport((current) => !current)}
          />
          {showReport ? (
            <View style={styles.drawerBody}>
              {report ? (
                <ReportSummary report={report} tone="command" />
              ) : (
                <StatusNotice type="info" message="Nenhum dado disponível." />
              )}
            </View>
          ) : null}

          <DrawerButton
            label="Abrir planejamento amplo"
            open={showPlanning}
            onPress={() => setShowPlanning((current) => !current)}
          />
          {showPlanning ? (
            <View style={styles.planningNote}>
              <Text style={styles.planningTitle}>Montanha</Text>
              <Text style={styles.planningText}>
                Referência estratégica: Sonho, Objetivos e Missões. Esta área fica fora do painel principal
                até virar uma funcionalidade real da fase correta.
              </Text>
              <View style={styles.mountainPath}>
                <MountainStep label="SONHO" text="Direção" />
                <View style={styles.pathLine} />
                <MountainStep label="OBJETIVOS" text="Plano" />
                <View style={styles.pathLine} />
                <MountainStep label="MISSÕES" text="Execução" active />
              </View>
            </View>
          ) : null}
        </View>
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

function CommandRow({ label, value }) {
  return (
    <View style={styles.commandRow}>
      <Text style={styles.commandRowLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.commandRowValue}>{value}</Text>
    </View>
  );
}

function CommandSection({ children, label, meta, urgent = false }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionLabel}>{label}</Text>
          <View style={[styles.sectionRule, urgent && styles.sectionRuleAlert]} />
        </View>
        {meta ? (
          <Text style={[styles.sectionMeta, urgent && styles.sectionMetaAlert]}>{meta}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function DrawerButton({ label, onPress, open }) {
  return (
    <Pressable onPress={onPress} style={styles.drawerButton}>
      <Text style={styles.drawerLabel}>{label}</Text>
      <Text style={styles.drawerState}>{open ? "FECHAR" : "ABRIR"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: commandColors.canvas,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    backgroundColor: commandColors.canvas,
    justifyContent: "center",
  },
  header: {
    backgroundColor: commandColors.panel,
    borderBottomColor: commandColors.border,
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
    color: commandColors.ink,
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
    backgroundColor: commandColors.panelMuted,
    borderColor: commandColors.borderStrong,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  generalBadgeText: {
    ...typography.small,
    color: commandColors.accentDark,
    fontWeight: "700",
  },
  title: {
    ...typography.title,
    color: commandColors.ink,
    marginTop: spacing.sm,
  },
  caption: {
    ...typography.caption,
    color: commandColors.muted,
    marginTop: spacing.xs,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.md,
  },
  logout: {
    color: commandColors.muted,
    fontSize: 12,
  },
  content: {
    padding: spacing.screenH,
    paddingBottom: spacing.xl + 64,
  },
  commandPanel: {
    backgroundColor: commandColors.white,
    borderColor: commandColors.borderStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.cardPad,
  },
  commandHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  commandKicker: {
    ...typography.small,
    color: commandColors.muted,
    fontWeight: "700",
  },
  commandTitle: {
    color: commandColors.ink,
    fontSize: 24,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  reviewPill: {
    backgroundColor: commandColors.panelMuted,
    borderColor: commandColors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  reviewPillAlert: {
    backgroundColor: "#F7E7E3",
    borderColor: commandColors.alert,
  },
  reviewPillText: {
    ...typography.small,
    color: commandColors.accentDark,
    fontWeight: "700",
  },
  reviewPillTextAlert: {
    color: commandColors.alert,
  },
  commandRows: {
    borderTopColor: commandColors.border,
    borderTopWidth: 1,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  commandRow: {
    alignItems: "center",
    borderBottomColor: commandColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  commandRowLabel: {
    ...typography.small,
    color: commandColors.muted,
    fontWeight: "700",
  },
  commandRowValue: {
    color: commandColors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  soldierButton: {
    alignItems: "center",
    backgroundColor: commandColors.accentDark,
    borderColor: commandColors.accentDark,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    marginTop: spacing.md,
  },
  disabledButton: {
    opacity: 0.7,
  },
  soldierButtonText: {
    ...typography.label,
    color: commandColors.white,
    fontWeight: "900",
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm + spacing.xs,
  },
  sectionLabel: {
    ...typography.label,
    color: commandColors.ink,
  },
  sectionMeta: {
    ...typography.small,
    color: commandColors.accentDark,
    fontWeight: "700",
  },
  sectionMetaAlert: {
    color: commandColors.alert,
  },
  sectionRule: {
    backgroundColor: commandColors.accent,
    height: 2,
    marginTop: spacing.sm,
    width: 48,
  },
  sectionRuleAlert: {
    backgroundColor: commandColors.alert,
  },
  drawerList: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  drawerButton: {
    alignItems: "center",
    backgroundColor: commandColors.panelMuted,
    borderColor: commandColors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  drawerLabel: {
    color: commandColors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  drawerState: {
    ...typography.small,
    color: commandColors.accentDark,
    fontWeight: "900",
  },
  drawerBody: {
    marginBottom: spacing.sm,
  },
  planningNote: {
    backgroundColor: commandColors.panel,
    borderColor: commandColors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  planningTitle: {
    ...typography.label,
    color: commandColors.ink,
    fontWeight: "800",
  },
  planningText: {
    color: commandColors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  mountainPath: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  mountainTitle: {
    ...typography.label,
    color: commandColors.ink,
  },
  mountainTitleActive: {
    color: commandColors.accentDark,
  },
  mountainText: {
    color: commandColors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  mountainStep: {
    flex: 1,
  },
  pathLine: {
    backgroundColor: commandColors.borderStrong,
    height: 1,
    marginHorizontal: spacing.sm,
    width: 18,
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    alignItems: "center",
    backgroundColor: commandColors.accent,
    borderColor: commandColors.accentDark,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  fabText: {
    color: commandColors.white,
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 32,
  },
});
