import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Redirect, router } from "expo-router";
import { BMButton } from "@/components/BMButton";
import { BMCard } from "@/components/BMCard";
import { BMInput } from "@/components/BMInput";
import { BMText } from "@/components/BMText";
import { Screen } from "@/components/Screen";
import { tokens } from "@/design/tokens";
import { useAuth } from "@/hooks/useAuth";

export default function LoginScreen() {
  const { authenticated, loading, login, status } = useAuth();
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");

  if (authenticated) {
    return <Redirect href="/(tabs)/soldado" />;
  }

  async function submit() {
    const ok = await login({ email: identificador, senha });
    if (ok) {
      router.replace("/(tabs)/soldado");
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrapper}>
        <View style={styles.identity}>
          <BMText title>BunkerMode</BMText>
          <BMText style={styles.lion}>TODO DIA EXISTE UM LEÃO.</BMText>
          <BMText muted>Planeje como General. Execute como Soldado.</BMText>
        </View>

        <BMCard>
          <BMText kicker>ENTRE NO BUNKER</BMText>
          <BMInput
            autoCapitalize="none"
            autoCorrect={false}
            label="E-mail ou usuário"
            onChangeText={setIdentificador}
            placeholder="usuario@email.com ou nome"
            value={identificador}
          />
          <BMInput
            label="Senha"
            onChangeText={setSenha}
            placeholder="senha"
            secureTextEntry
            value={senha}
          />
          {status.message ? (
            <BMText style={status.type === "error" ? styles.error : styles.success}>{status.message}</BMText>
          ) : null}
          <BMButton disabled={loading} label={loading ? "AGUARDE" : "ENTRAR NO BUNKER"} onPress={submit} />
        </BMCard>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: tokens.colors.danger,
  },
  identity: {
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xl,
  },
  lion: {
    color: tokens.colors.fire,
    fontWeight: tokens.typography.labelWeight,
  },
  success: {
    color: tokens.colors.success,
  },
  wrapper: {
    gap: tokens.spacing.xl,
  },
});
