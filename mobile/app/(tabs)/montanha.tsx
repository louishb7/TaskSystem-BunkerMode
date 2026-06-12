import { StyleSheet, View } from "react-native";
import { BMCard } from "@/components/BMCard";
import { BMText } from "@/components/BMText";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { Screen } from "@/components/Screen";
import { tokens } from "@/design/tokens";
import { useMountain } from "@/hooks/useMountain";

export default function MountainScreen() {
  const mountain = useMountain();

  return (
    <Screen>
      <View style={styles.header}>
        <BMText kicker>MAPA ESTRATÉGICO</BMText>
        <BMText title>Montanha</BMText>
        <BMText muted>Sonho, objetivos e ordens em formato vertical para tela pequena.</BMText>
      </View>

      {mountain.loading ? <LoadingState message="Carregando Montanha." /> : null}

      {mountain.status.message ? (
        <BMCard style={styles.errorCard}>
          <BMText>{mountain.status.message}</BMText>
        </BMCard>
      ) : null}

      {mountain.sonhoPrincipal ? (
        <BMCard style={styles.hero}>
          <BMText kicker>SONHO PRINCIPAL</BMText>
          <BMText style={styles.heroTitle}>{mountain.sonhoPrincipal.titulo}</BMText>
          {mountain.sonhoPrincipal.descricao ? <BMText muted>{mountain.sonhoPrincipal.descricao}</BMText> : null}
        </BMCard>
      ) : (
        <EmptyState title="Sem sonho principal" message="Quando o General definir um sonho principal, ele aparece aqui." />
      )}

      <View style={styles.list}>
        {mountain.objetivos.map((objetivo) => {
          const missions = mountain.missionsByObjetivo.get(objetivo.id) || [];
          return (
            <BMCard key={objetivo.id}>
              <BMText kicker>{objetivo.status}</BMText>
              <BMText style={styles.objectiveTitle}>{objetivo.titulo}</BMText>
              {objetivo.descricao ? <BMText muted>{objetivo.descricao}</BMText> : null}
              {missions.length > 0 ? (
                <View style={styles.orders}>
                  {missions.slice(0, 4).map((mission) => (
                    <View key={mission.id} style={styles.order}>
                      <BMText>{mission.titulo}</BMText>
                      <BMText muted>{mission.status_label}</BMText>
                    </View>
                  ))}
                </View>
              ) : (
                <BMText muted>Sem ordens vinculadas carregadas.</BMText>
              )}
            </BMCard>
          );
        })}
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
  hero: {
    backgroundColor: tokens.colors.surfaceDeep,
    borderColor: tokens.colors.fireBorder,
  },
  heroTitle: {
    color: tokens.colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  list: {
    gap: tokens.spacing.md,
  },
  objectiveTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  order: {
    borderTopColor: tokens.colors.border,
    borderTopWidth: 1,
    gap: tokens.spacing.xs,
    paddingTop: tokens.spacing.sm,
  },
  orders: {
    gap: tokens.spacing.sm,
  },
});
