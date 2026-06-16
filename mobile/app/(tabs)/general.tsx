import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { BMButton } from "@/components/BMButton";
import { BMCard } from "@/components/BMCard";
import { BMInput } from "@/components/BMInput";
import { BMText } from "@/components/BMText";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { Screen } from "@/components/Screen";
import { tokens } from "@/design/tokens";
import { useAuth } from "@/hooks/useAuth";
import { formatDateForApi, normalizeMissionDate, useMissions } from "@/hooks/useMissions";
import type { CreateMissionPayload, Mission } from "@/types/mission";

function isCompleted(mission: Mission): boolean {
  return mission.status_code === "CONCLUIDA";
}

function isFailure(mission: Mission): boolean {
  return mission.status_code.startsWith("FALHA");
}

function formatSelectedDate(date: Date): string {
  return date
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", weekday: "long" })
    .toUpperCase();
}

function groupMissions(missions: Mission[]) {
  return {
    completed: missions.filter((mission) => mission.is_pinned !== true && isCompleted(mission)),
    failures: missions.filter((mission) => mission.is_pinned !== true && !isCompleted(mission) && isFailure(mission)),
    highPriority: missions.filter((mission) => mission.is_pinned === true),
    pending: missions.filter((mission) => mission.is_pinned !== true && !isCompleted(mission) && !isFailure(mission)),
  };
}

function MissionRow({
  deleting,
  mission,
  onComplete,
  onDelete,
  onFail,
  onReopen,
  onTogglePin,
  pinning,
  working,
}: {
  deleting: boolean;
  mission: Mission;
  onComplete: () => void;
  onDelete: () => void;
  onFail: () => void;
  onReopen: () => void;
  onTogglePin: () => void;
  pinning: boolean;
  working: boolean;
}) {
  const completed = isCompleted(mission);
  const disabled = working || deleting || pinning;

  return (
    <BMCard style={[styles.orderCard, mission.is_pinned && styles.priorityCard, completed && styles.completedCard]}>
      <View style={styles.orderHeader}>
        <BMText style={styles.orderTitle}>{mission.titulo || "Sem título"}</BMText>
        <BMText kicker>{mission.status_label}</BMText>
      </View>
      {mission.operacao_nome ? <BMText muted>Operação: {mission.operacao_nome}</BMText> : null}
      {mission.instrucao ? <BMText muted>{mission.instrucao}</BMText> : <BMText muted>Sem instrução adicional.</BMText>}

      <View style={styles.actionRow}>
        {mission.permissions.can_pin ? (
          <BMButton
            disabled={disabled}
            label={pinning ? "AGUARDE" : mission.is_pinned ? "BAIXAR PRIORIDADE" : "PRIORIDADE"}
            onPress={onTogglePin}
            variant="secondary"
          />
        ) : null}
        {mission.permissions.can_complete && !completed ? (
          <BMButton disabled={disabled} label={working ? "AGUARDE" : "ABATER"} onPress={onComplete} />
        ) : null}
        {mission.permissions.can_fail && !completed ? (
          <BMButton disabled={disabled} label={working ? "AGUARDE" : "REGISTRAR FALHA"} onPress={onFail} variant="danger" />
        ) : null}
        {completed && mission.permissions.can_edit ? (
          <BMButton disabled={disabled} label={working ? "AGUARDE" : "REABRIR"} onPress={onReopen} variant="secondary" />
        ) : null}
        {mission.permissions.can_delete ? (
          <BMButton disabled={disabled} label={deleting ? "AGUARDE" : "REMOVER"} onPress={onDelete} variant="danger" />
        ) : null}
      </View>
    </BMCard>
  );
}

export default function GeneralScreen() {
  const auth = useAuth();
  const missions = useMissions();
  const router = useRouter();
  const [modeLoading, setModeLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const selectedDate = useMemo(() => new Date(), []);
  const selectedDateApi = formatDateForApi(selectedDate);
  const selectedMissions = useMemo(
    () => missions.dailyMissions.filter((mission) => normalizeMissionDate(mission.prazo) === selectedDateApi),
    [missions.dailyMissions, selectedDateApi]
  );
  const groups = useMemo(() => groupMissions(selectedMissions), [selectedMissions]);
  const completed = selectedMissions.filter(isCompleted).length;
  const failures = selectedMissions.filter(isFailure).length;
  const priority = selectedMissions.filter((mission) => mission.is_pinned === true).length;
  const pending = Math.max(0, selectedMissions.length - completed - failures);
  const activeCount = groups.highPriority.filter((mission) => !isCompleted(mission)).length + groups.pending.length + groups.failures.length;

  async function activateSoldierMode() {
    setModeLoading(true);
    const ok = await auth.setMode("soldier");
    setModeLoading(false);
    if (ok) {
      router.replace("/(tabs)/soldado");
    }
  }

  async function createOrder() {
    const payload: CreateMissionPayload = {
      duration_type: null,
      instrucao: instruction.trim(),
      objetivo_id: null,
      prazo: selectedDateApi,
      recurrence_end_date: null,
      recurrence_weekdays: null,
      sonho_id: null,
      titulo: title.trim(),
    };

    const ok = await missions.createMission(payload);
    if (ok) {
      setTitle("");
      setInstruction("");
      setFormOpen(false);
    }
  }

  function confirmDelete(mission: Mission) {
    Alert.alert("Remover ordem", `"${mission.titulo}" será removida do quadro.`, [
      { style: "cancel", text: "Cancelar" },
      { onPress: () => missions.deleteMission(mission), style: "destructive", text: "Remover" },
    ]);
  }

  function renderGroup(label: string, groupMissions: Mission[]) {
    if (groupMissions.length === 0) {
      return null;
    }

    return (
      <View style={styles.group}>
        <View style={styles.groupHeader}>
          <BMText kicker>{label}</BMText>
          <BMText style={styles.groupCount}>{String(groupMissions.length)}</BMText>
        </View>
        {groupMissions.map((mission) => (
          <MissionRow
            key={mission.id}
            deleting={missions.deleteLoadingId === mission.id}
            mission={mission}
            onComplete={() => missions.completeMission(mission)}
            onDelete={() => confirmDelete(mission)}
            onFail={() => missions.failMission(mission)}
            onReopen={() => missions.reopenMission(mission)}
            onTogglePin={() => missions.toggleMissionPin(mission)}
            pinning={missions.pinLoadingId === mission.id}
            working={
              missions.completeLoadingId === mission.id ||
              missions.failureLoadingId === mission.id ||
              missions.reopenLoadingId === mission.id
            }
          />
        ))}
      </View>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <BMText kicker>SALA DE GUERRA</BMText>
        <BMText title>Comando operacional</BMText>
        <BMText muted>
          {(auth.user?.nome_general || auth.user?.usuario || "General")} / {formatSelectedDate(selectedDate)}
        </BMText>
      </View>

      <View style={styles.headerActions}>
        <BMButton disabled={modeLoading || auth.loading} label={modeLoading ? "ATIVANDO" : "MODO SOLDADO"} onPress={activateSoldierMode} />
      </View>

      {missions.status.message ? (
        <BMCard style={missions.status.type === "error" ? styles.errorCard : styles.successCard}>
          <BMText>{missions.status.message}</BMText>
        </BMCard>
      ) : null}

      <View style={styles.metrics}>
        <BMCard style={styles.metric}>
          <BMText kicker>ORDENS DO DIA</BMText>
          <BMText title>{String(selectedMissions.length)}</BMText>
        </BMCard>
        <BMCard style={styles.metric}>
          <BMText kicker>CUMPRIDAS</BMText>
          <BMText title>{String(completed)}</BMText>
        </BMCard>
        <BMCard style={styles.metric}>
          <BMText kicker>PENDENTES</BMText>
          <BMText title>{String(pending)}</BMText>
        </BMCard>
        <BMCard style={styles.metric}>
          <BMText kicker>PRIORIDADE</BMText>
          <BMText title>{String(priority)}</BMText>
        </BMCard>
      </View>

      <BMCard style={styles.panel}>
        <View style={styles.panelHeader}>
          <View style={styles.panelCopy}>
            <BMText kicker>QUADRO DO DIA</BMText>
            <BMText style={styles.panelTitle}>Mesa operacional</BMText>
            <BMText muted>
              {activeCount > 0
                ? `${activeCount} em aberto. ${completed} cumpridas.`
                : completed > 0
                  ? "Todas as ordens do dia foram cumpridas."
                  : "Nenhuma ordem definida para o dia selecionado."}
            </BMText>
          </View>
          <BMButton label={formOpen ? "FECHAR" : "NOVA ORDEM"} onPress={() => setFormOpen((current) => !current)} />
        </View>

        {formOpen ? (
          <View style={styles.form}>
            <BMInput label="Título" onChangeText={setTitle} placeholder="Ex.: Revisar plano semanal" value={title} />
            <BMInput
              label="Instrução"
              multiline
              onChangeText={setInstruction}
              placeholder="Contexto operacional da ordem"
              style={styles.textArea}
              value={instruction}
            />
            <BMButton disabled={missions.formLoading} label={missions.formLoading ? "AGUARDE" : "REGISTRAR ORDEM"} onPress={createOrder} />
          </View>
        ) : null}

        {missions.loading ? <LoadingState message="Sincronizando comando." /> : null}

        {!missions.loading && selectedMissions.length === 0 ? (
          <EmptyState title="Dia sem ordens" message="Nenhuma ordem foi definida para o dia selecionado." />
        ) : null}

        {renderGroup("Prioridade elevada", groups.highPriority)}
        {renderGroup("Pendentes", groups.pending)}
        {renderGroup("Falhas registradas", groups.failures)}
        {renderGroup("Cumpridas", groups.completed)}
      </BMCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
  completedCard: {
    opacity: 0.82,
  },
  errorCard: {
    backgroundColor: tokens.colors.dangerWash,
    borderColor: tokens.colors.danger,
  },
  form: {
    gap: tokens.spacing.md,
  },
  group: {
    gap: tokens.spacing.sm,
  },
  groupCount: {
    color: tokens.colors.fire,
    fontWeight: "900",
  },
  groupHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  header: {
    gap: tokens.spacing.sm,
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
  metric: {
    backgroundColor: tokens.colors.surfaceDeep,
    flex: 1,
    minWidth: "45%",
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.md,
  },
  orderCard: {
    gap: tokens.spacing.md,
  },
  orderHeader: {
    gap: tokens.spacing.xs,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  panel: {
    gap: tokens.spacing.lg,
  },
  panelCopy: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  panelHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: tokens.spacing.md,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  priorityCard: {
    borderColor: tokens.colors.fireBorder,
  },
  successCard: {
    backgroundColor: tokens.colors.successWash,
    borderColor: tokens.colors.success,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: "top",
  },
});
