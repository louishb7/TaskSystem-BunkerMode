import { StyleSheet, View } from "react-native";
import { BMCard } from "@/components/BMCard";
import { BMText } from "@/components/BMText";
import { LoadingState } from "@/components/LoadingState";
import { Screen } from "@/components/Screen";
import { tokens } from "@/design/tokens";
import { useMissions } from "@/hooks/useMissions";

export default function GeneralScreen() {
  const missions = useMissions();
  const total = missions.generalMissions.length;
  const pending = missions.generalMissions.filter((mission) => mission.status_code === "PENDENTE").length;
  const completed = missions.generalMissions.filter((mission) => mission.status_code === "CONCLUIDA").length;

  return (
    <Screen>
      <View style={styles.header}>
        <BMText kicker>COMANDO</BMText>
        <BMText title>General</BMText>
        <BMText muted>Resumo mínimo para planejamento mobile. A execução continua no Soldado.</BMText>
      </View>

      {missions.loading ? <LoadingState message="Carregando comando." /> : null}

      <View style={styles.grid}>
        <BMCard style={styles.metric}>
          <BMText kicker>ORDENS</BMText>
          <BMText title>{String(total)}</BMText>
        </BMCard>
        <BMCard style={styles.metric}>
          <BMText kicker>PENDENTES</BMText>
          <BMText title>{String(pending)}</BMText>
        </BMCard>
        <BMCard style={styles.metric}>
          <BMText kicker>EXECUTADAS</BMText>
          <BMText title>{String(completed)}</BMText>
        </BMCard>
      </View>

      <BMCard>
        <BMText kicker>ESCOPO INICIAL</BMText>
        <BMText muted>
          Esta versão mobile mantém o General enxuto. A criação rápida de ordem fica no Soldado e a
          visão estratégica inicial fica na Montanha.
        </BMText>
      </BMCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: tokens.spacing.md,
  },
  header: {
    gap: tokens.spacing.sm,
  },
  metric: {
    backgroundColor: tokens.colors.surfaceDeep,
  },
});
