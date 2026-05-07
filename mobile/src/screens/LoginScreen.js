import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../api/client";
import BrandSymbol from "../components/BrandSymbol";
import TacticalPanel from "../components/TacticalPanel";
import TacticalScreen from "../components/TacticalScreen";
import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

function getErrorMessage(result, fallback) {
  return result?.data?.detail || fallback;
}

export default function LoginScreen({ onAuthenticated }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState("");

  async function handleLogin() {
    if (!usuario.trim() || !senha) {
      setError("Preencha usuário e senha.");
      return;
    }

    setLoading(true);
    setError("");
    const result = await api.login({ email: usuario.trim(), senha });
    setLoading(false);

    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível entrar em campo."));
      return;
    }

    onAuthenticated(result.data.access_token, result.data.usuario);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboard}
    >
      <TacticalScreen denseBackground variant="login">
        <View style={styles.container}>
          <View style={styles.identity}>
            <BrandSymbol size={132} />
            <Text style={styles.brand}>BUNKERMODE</Text>
            <Text style={styles.subtitle}>O GENERAL PENSA. O SOLDADO EXECUTA.</Text>
          </View>

          <TacticalPanel elevated style={styles.form}>
            <Text style={styles.formLabel}>ACESSO OPERACIONAL</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onBlur={() => setFocusedField("")}
              onChangeText={setUsuario}
              onFocus={() => setFocusedField("usuario")}
              placeholder="usuário"
              placeholderTextColor={theme.colors.textDim}
              style={[styles.input, focusedField === "usuario" && styles.inputFocused]}
              value={usuario}
            />
            <TextInput
              autoCapitalize="none"
              onBlur={() => setFocusedField("")}
              onChangeText={setSenha}
              onFocus={() => setFocusedField("senha")}
              placeholder="senha"
              placeholderTextColor={theme.colors.textDim}
              secureTextEntry
              style={[styles.input, focusedField === "senha" && styles.inputFocused]}
              value={senha}
            />

            <Pressable
              disabled={loading}
              onPress={handleLogin}
              style={({ pressed }) => [styles.button, (pressed || loading) && styles.buttonActive]}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.black} />
              ) : (
                <Text style={styles.buttonText}>ENTRAR EM CAMPO</Text>
              )}
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </TacticalPanel>
        </View>
      </TacticalScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.screen,
  },
  identity: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  brand: {
    ...theme.typography.title,
    color: theme.colors.text,
    fontSize: 28,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    ...theme.typography.label,
    color: theme.colors.red,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  form: {
    gap: theme.spacing.sm,
  },
  formLabel: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    marginBottom: theme.spacing.xs,
  },
  input: {
    ...theme.typography.body,
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: theme.layout.actionHeight,
    paddingHorizontal: theme.spacing.md,
  },
  inputFocused: {
    borderColor: theme.colors.red,
  },
  button: {
    alignItems: "center",
    backgroundColor: theme.colors.red,
    borderColor: theme.colors.red,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    height: theme.layout.actionHeight,
    justifyContent: "center",
    marginTop: theme.spacing.xs,
    width: "100%",
  },
  buttonActive: {
    opacity: 0.78,
  },
  buttonText: {
    ...theme.typography.label,
    color: theme.colors.black,
    fontSize: 14,
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.red,
    textAlign: "center",
  },
});
