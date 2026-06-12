import { useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { BMButton } from "@/components/BMButton";
import { BMCard } from "@/components/BMCard";
import { BMInput } from "@/components/BMInput";
import { BMText } from "@/components/BMText";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { Screen } from "@/components/Screen";
import { tokens } from "@/design/tokens";
import { useMissions } from "@/hooks/useMissions";
import type { Mission } from "@/types/mission";

function formatTurnDate(value?: string | null) {
  if (!value) {
    return "HOJE";
  }
  return value.slice(0, 10);
}

function MissionCard({ mission, onComplete, disabled }: { disabled: boolean; mission: Mission; onComplete: () => void }) {
  return (
    <BMCard style={[styles.missionCard, mission.is_pinned && styles.pinnedCard]}>
      <View style={styles.missionHeader}>
        <BMText kicker>{mission.is_pinned ? "PRIORIDADE" : mission.status_label}</BMText>
        <BMText muted>{mission.prazo || "sem data"}</BMText>
      </View>
      <BMText style={styles.missionTitle}>{mission.titulo}</BMText>
      {mission.instrucao ? <BMText muted>{mission.instrucao}</BMText> : null}
      <BMButton disabled={disabled || !mission.permissions.can_complete} label="CONCLUIR ORDEM" onPress={onComplete} />
    </BMCard>
  );
}

export default function SoldierScreen() {
  const missions = useMissions();
  const [quickTitle, setQuickTitle] = useState("");

  async function createQuickMission() {
    const ok = await missions.createQuickMission(quickTitle);
    if (ok) {
      setQuickTitle("");
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <BMText kicker>FOCO OPERACIONAL</BMText>
        <BMText title>Leão do dia</BMText>
        <BMText muted>{formatTurnDate(missions.board?.turn?.active_date_label)}</BMText>
      </View>

      {missions.status.message ? (
        <BMCard style={missions.status.type === "error" ? styles.errorCard : styles.successCard}>
          <BMText>{missions.status.message}</BMText>
        </BMCard>
      ) : null}

      <BMCard>
        <BMText kicker>ORDEM RÁPIDA</BMText>
        <BMInput label="Título" onChangeText={setQuickTitle} placeholder="Ex.: Revisar plano semanal" value={quickTitle} />
        <BMButton disabled={missions.mutating} label="REGISTRAR PARA HOJE" onPress={createQuickMission} />
      </BMCard>

      {missions.loading ? <LoadingState message="Sincronizando ordens." /> : null}

      {!missions.loading && missions.actionMissions.length === 0 ? (
        <EmptyState title="Nenhuma ordem em aberto" message="O General não definiu missões pendentes para este dia." />
      ) : null}

      <View style={styles.list}>
        {missions.actionMissions.map((mission) => (
          <MissionCard
            key={mission.id}
            disabled={missions.mutating}
            mission={mission}
            onComplete={() => missions.completeMission(mission)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    backgroundColor: tokens.colors.dangerWash,
    borderColor: tokens.colors.danger,
  },
  header: {
    gap: tokens.spacing.sm,
  },
  list: {
    gap: tokens.spacing.md,
  },
  missionCard: {
    borderLeftColor: tokens.colors.fire,
    borderLeftWidth: 3,
  },
  missionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  pinnedCard: {
    borderColor: tokens.colors.fireBorder,
  },
  successCard: {
    backgroundColor: tokens.colors.successWash,
    borderColor: tokens.colors.success,
  },
});
