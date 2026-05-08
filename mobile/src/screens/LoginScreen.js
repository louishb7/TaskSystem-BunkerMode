import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../api/client";
import BrandSymbol from "../components/BrandSymbol";
import KeyboardAwareScreen from "../components/KeyboardAwareScreen";
import TacticalPanel from "../components/TacticalPanel";
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
  const usuarioRef = useRef(null);
  const senhaRef = useRef(null);

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
      setError(getErrorMessage(result, "Não foi possível entrar no bunker."));
      return;
    }

    onAuthenticated(result.data.access_token, result.data.usuario);
  }

  return (
    <KeyboardAwareScreen
      bottomPadding={theme.spacing.xxl}
      contentContainerStyle={styles.container}
      denseBackground
      keyboardBottomPadding={240}
      variant="login"
    >
      {({ scrollToFocusedInput }) => (
        <>
          <View style={styles.identity}>
            <BrandSymbol size={118} />
            <Text style={styles.brand}>BUNKERMODE</Text>
            <Text style={styles.subtitle}>TODO DIA EXISTE UM LEÃO.</Text>
            <Text style={styles.support}>PLANEJE COMO GENERAL. EXECUTE COMO SOLDADO.</Text>
          </View>

          <TacticalPanel elevated style={styles.form}>
            <Text style={styles.formLabel}>ENTRE NO BUNKER</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onBlur={() => setFocusedField("")}
              onChangeText={setUsuario}
              onFocus={() => {
                setFocusedField("usuario");
                scrollToFocusedInput(usuarioRef);
              }}
              placeholder="usuário"
              placeholderTextColor={theme.colors.textDim}
              ref={usuarioRef}
              style={[styles.input, focusedField === "usuario" && styles.inputFocused]}
              value={usuario}
            />
            <TextInput
              autoCapitalize="none"
              onBlur={() => setFocusedField("")}
              onChangeText={setSenha}
              onFocus={() => {
                setFocusedField("senha");
                scrollToFocusedInput(senhaRef);
              }}
              placeholder="senha"
              placeholderTextColor={theme.colors.textDim}
              ref={senhaRef}
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
                <Text style={styles.buttonText}>ENTRAR NO BUNKER</Text>
              )}
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </TacticalPanel>
        </>
      )}
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.xl,
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
  support: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
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
