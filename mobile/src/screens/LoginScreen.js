import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../api/client";
import { colors, layout, radius, spacing, typography } from "../styles/tokens";

const logo = require("../assets/bunkermode/logo/logo_final_selected.png");

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
      setError("Preencha usuario e senha.");
      return;
    }

    setLoading(true);
    setError("");
    const result = await api.login({ email: usuario.trim(), senha });
    setLoading(false);

    if (!result.ok) {
      setError(getErrorMessage(result, "Nao foi possivel entrar em campo."));
      return;
    }

    onAuthenticated(result.data.access_token, result.data.usuario);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.top}>
        <Image resizeMode="contain" source={logo} style={styles.logo} />
        <Text style={styles.brand}>BUNKERMODE</Text>
        <Text style={styles.subtitle}>GENERAL PENSA. SOLDADO EXECUTA.</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setUsuario}
          onBlur={() => setFocusedField("")}
          onFocus={() => setFocusedField("usuario")}
          placeholder="usuario"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, focusedField === "usuario" && styles.inputFocused]}
          value={usuario}
        />
        <TextInput
          autoCapitalize="none"
          onBlur={() => setFocusedField("")}
          onFocus={() => setFocusedField("senha")}
          onChangeText={setSenha}
          placeholder="senha"
          placeholderTextColor={colors.textMuted}
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
            <ActivityIndicator color={colors.black} />
          ) : (
            <Text style={styles.buttonText}>ENTRAR EM CAMPO</Text>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.bg,
    justifyContent: "center",
    paddingHorizontal: spacing.screenH,
  },
  top: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  brand: {
    ...typography.label,
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginTop: spacing.sm,
    textAlign: "center",
  },
  logo: {
    height: 110,
    marginBottom: spacing.md,
    width: 110,
  },
  form: {
    gap: spacing.sm + spacing.xs,
    width: layout.loginWidth,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: typography.input.fontSize,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs + spacing.xs / 2,
  },
  inputFocused: {
    borderColor: colors.red,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.red,
    borderColor: colors.red,
    borderWidth: 1,
    borderRadius: radius.md,
    height: layout.loginButtonHeight,
    justifyContent: "center",
    width: layout.fullWidth,
  },
  buttonActive: {
    opacity: 0.85,
  },
  buttonText: {
    ...typography.label,
    color: colors.black,
    fontWeight: "700",
  },
  error: {
    ...typography.notice,
    color: colors.red,
    textAlign: "center",
  },
});
