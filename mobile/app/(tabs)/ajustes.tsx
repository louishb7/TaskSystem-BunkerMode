import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { healthCheck } from "@/api/client";
import { BMButton } from "@/components/BMButton";
import { BMCard } from "@/components/BMCard";
import { BMText } from "@/components/BMText";
import { Screen } from "@/components/Screen";
import { getApiBaseUrl } from "@/config/env";
import { tokens } from "@/design/tokens";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsScreen() {
  const { logout, user } = useAuth();
  const [healthStatus, setHealthStatus] = useState("");

  async function checkHealth() {
    const result = await healthCheck();
    setHealthStatus(result.ok ? "API respondeu ao /health." : result.message);
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  let apiUrl = "";
  try {
    apiUrl = getApiBaseUrl();
  } catch (error) {
    apiUrl = error instanceof Error ? error.message : "Configuração da API ausente.";
  }

  return (
    <Screen>
      <View style={styles.header}>
        <BMText kicker>CONFIGURAÇÃO</BMText>
        <BMText title>Ajustes</BMText>
      </View>

      <BMCard>
        <BMText kicker>SESSÃO</BMText>
        <BMText>{user?.nome_general || user?.usuario || "Usuário"}</BMText>
        <BMText muted>{user?.email}</BMText>
        <BMButton label="SAIR" onPress={handleLogout} variant="secondary" />
      </BMCard>

      <BMCard>
        <BMText kicker>API</BMText>
        <BMText muted>{apiUrl}</BMText>
        {healthStatus ? <BMText style={healthStatus.includes("respondeu") ? styles.success : styles.error}>{healthStatus}</BMText> : null}
        <BMButton label="TESTAR /HEALTH" onPress={checkHealth} />
      </BMCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: tokens.colors.danger,
  },
  header: {
    gap: tokens.spacing.sm,
  },
  success: {
    color: tokens.colors.success,
  },
});
