import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { BMButton } from "@/components/BMButton";
import { BMCard } from "@/components/BMCard";
import { BMText } from "@/components/BMText";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { Screen } from "@/components/Screen";
import { tokens } from "@/design/tokens";
import { useAuth } from "@/hooks/useAuth";
import { useMissions } from "@/hooks/useMissions";
import type { Mission } from "@/types/mission";

function isCompleted(mission: Mission): boolean {
  return mission.status_code === "CONCLUIDA";
}

function formatTurnDate(value?: string | null) {
  if (!value || typeof value !== "string") {
    return "HOJE";
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    if (year && month && day) {
      return new Date(year, month - 1, day)
        .toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", weekday: "long" })
        .toUpperCase();
    }
  }

  return value.toUpperCase();
}

function statusText(mission: Mission): string {
  const statusCode = mission.status_code.toUpperCase();
  if (statusCode === "PENDENTE" || statusCode === "CONCLUIDA") {
    return "";
  }
  if (statusCode.startsWith("FALHA")) {
    return "FALHOU";
  }
  return mission.status_label || "";
}

function Progress({ missions }: { missions: Mission[] }) {
  const total = missions.length;
  const completed = missions.filter(isCompleted).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <BMCard style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <BMText kicker>CAÇADA</BMText>
        <BMText style={styles.progressValue}>{total === 0 ? "DIA OFF" : `${percent}%`}</BMText>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
    </BMCard>
  );
}

function MissionCard({
  completing,
  failing,
  mission,
  onComplete,
  onFail,
  onTogglePin,
  pinning,
}: {
  completing: boolean;
  failing: boolean;
  mission: Mission;
  onComplete: () => void;
  onFail: () => void;
  onTogglePin: () => void;
  pinning: boolean;
}) {
  const failed = mission.status_code.startsWith("FALHA");
  const currentStatus = statusText(mission);
  const disabled = completing || failing || pinning;

  return (
    <BMCard style={[styles.missionCard, mission.is_pinned && styles.pinnedCard, failed && styles.failedCard]}>
      <View style={styles.badgeRow}>
        {mission.is_pinned ? <BMText style={styles.criticalTag}>PRIORIDADE ELEVADA</BMText> : null}
        {mission.operacao_nome ? <BMText style={styles.metaTag}>OPERAÇÃO</BMText> : null}
        {mission.is_previous_operational_pending ? <BMText style={styles.warningTag}>PENDÊNCIA DO DIA ANTERIOR</BMText> : null}
        {currentStatus ? <BMText style={styles.metaTag}>{currentStatus}</BMText> : null}
      </View>

      <View style={styles.titleRow}>
        <BMText style={styles.missionTitle}>{mission.titulo || "Sem título"}</BMText>
        {mission.permissions.can_pin && (
          <BMButton
            disabled={disabled}
            label={mission.is_pinned ? "BAIXAR" : "PRIORIDADE"}
            onPress={onTogglePin}
            style={styles.pinButton}
            variant="secondary"
          />
        )}
      </View>

      {mission.operacao_nome ? <BMText muted>Operação: {mission.operacao_nome}</BMText> : null}
      {mission.instrucao ? <BMText muted>{mission.instrucao}</BMText> : null}
      {mission.is_previous_operational_pending ? (
        <BMText muted>Esta ordem ainda pertence ao ciclo operacional anterior.</BMText>
      ) : null}

      <View style={styles.actionRow}>
        {mission.permissions.can_fail ? (
          <BMButton disabled={disabled} label={failing ? "AGUARDE" : "FALHEI"} onPress={onFail} variant="danger" />
        ) : null}
        {mission.permissions.can_complete ? (
          <BMButton disabled={disabled} label={completing ? "AGUARDE" : "ABATER"} onPress={onComplete} />
        ) : null}
      </View>
    </BMCard>
  );
}

export default function SoldierScreen() {
  const auth = useAuth();
  const missions = useMissions();
  const router = useRouter();
  const [returnLoading, setReturnLoading] = useState(false);
  const turn = missions.board?.turn;
  const showTurnWarning = turn?.requires_decision === true && !missions.operationalTurnAcknowledged;
  const hasCompletedMissions = missions.dailyMissions.some(isCompleted);

  async function returnToCommand() {
    setReturnLoading(true);
    const ok = await auth.setMode("general");
    setReturnLoading(false);
    if (ok) {
      router.replace("/(tabs)/general");
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <BMText kicker>FOCO OPERACIONAL</BMText>
        <BMText title>Leão do dia</BMText>
        <BMText muted>{formatTurnDate(turn?.active_date_label)}</BMText>
      </View>

      <Progress missions={missions.dailyMissions.length > 0 ? missions.dailyMissions : missions.actionMissions} />

      {missions.status.message ? (
        <BMCard style={missions.status.type === "error" ? styles.errorCard : styles.successCard}>
          <BMText>{missions.status.message}</BMText>
        </BMCard>
      ) : null}

      {showTurnWarning ? (
        <BMCard style={styles.turnCard}>
          <BMText kicker>TRANSIÇÃO DE TURNO</BMText>
          <BMText style={styles.turnTitle}>Existem ordens pendentes do ciclo anterior.</BMText>
          <BMText muted>
            O novo dia já tem ordens prontas. Continue o ciclo anterior ou encerre as pendências
            como falha para abrir a nova operação.
          </BMText>
          <View style={styles.actionRow}>
            <BMButton disabled={missions.loading} label="CONTINUAR" onPress={missions.continuePreviousOperationalTurn} variant="secondary" />
            <BMButton disabled={missions.loading} label="ENCERRAR PENDÊNCIAS" onPress={missions.closePreviousOperationalTurn} variant="danger" />
          </View>
        </BMCard>
      ) : null}

      {missions.loading ? <LoadingState message="Sincronizando ordens." /> : null}

      {!missions.loading && missions.actionMissions.length === 0 ? (
        missions.dailyMissions.length === 0 ? (
          <EmptyState title="Nenhuma ordem para hoje" message="O General não definiu missões para este dia." />
        ) : hasCompletedMissions ? (
          <EmptyState title="Caçada concluída" message="Todos os leões do dia foram abatidos." />
        ) : (
          <EmptyState title="Sem ordens em aberto" message="As missões do dia foram registradas como falha." />
        )
      ) : null}

      <View style={styles.list}>
        {missions.actionMissions.map((mission) => (
          <MissionCard
            key={mission.id}
            completing={missions.completeLoadingId === mission.id}
            failing={missions.failureLoadingId === mission.id}
            mission={mission}
            onComplete={() => missions.completeMission(mission)}
            onFail={() => missions.failMission(mission)}
            onTogglePin={() => missions.toggleMissionPin(mission)}
            pinning={missions.pinLoadingId === mission.id}
          />
        ))}
      </View>

      <BMButton
        disabled={returnLoading || auth.loading}
        label={returnLoading || auth.loading ? "AGUARDE" : "RETORNAR AO COMANDO / GENERAL"}
        onPress={returnToCommand}
        variant="secondary"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs,
  },
  criticalTag: {
    color: tokens.colors.fire,
    fontSize: 11,
    fontWeight: "900",
  },
  errorCard: {
    backgroundColor: tokens.colors.dangerWash,
    borderColor: tokens.colors.danger,
  },
  failedCard: {
    borderColor: tokens.colors.danger,
  },
  header: {
    gap: tokens.spacing.sm,
  },
  list: {
    gap: tokens.spacing.md,
  },
  metaTag: {
    color: tokens.colors.textDim,
    fontSize: 11,
    fontWeight: "900",
  },
  missionCard: {
    gap: tokens.spacing.md,
  },
  missionTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
  },
  pinButton: {
    minHeight: 38,
    paddingHorizontal: tokens.spacing.sm,
  },
  pinnedCard: {
    borderColor: tokens.colors.fireBorder,
  },
  progressCard: {
    gap: tokens.spacing.sm,
  },
  progressFill: {
    backgroundColor: tokens.colors.fire,
    borderRadius: tokens.radius.sm,
    height: 8,
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressTrack: {
    backgroundColor: tokens.colors.surfaceDeep,
    borderRadius: tokens.radius.sm,
    height: 8,
    overflow: "hidden",
  },
  progressValue: {
    color: tokens.colors.fire,
    fontSize: 18,
    fontWeight: "900",
  },
  successCard: {
    backgroundColor: tokens.colors.successWash,
    borderColor: tokens.colors.success,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: tokens.spacing.sm,
  },
  turnCard: {
    backgroundColor: tokens.colors.fireWash,
    borderColor: tokens.colors.fireBorder,
    gap: tokens.spacing.md,
  },
  turnTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  warningTag: {
    color: tokens.colors.danger,
    fontSize: 11,
    fontWeight: "900",
  },
});
