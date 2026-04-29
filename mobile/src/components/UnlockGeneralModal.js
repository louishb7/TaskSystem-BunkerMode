import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../api/client";
import { colors, layout, radius, spacing, typography } from "../styles/tokens";
import StatusNotice from "./StatusNotice";

function getErrorMessage(result, fallback) {
  return result?.data?.detail || fallback;
}

export default function UnlockGeneralModal({ visible, token, onSuccess, onCancel }) {
  const [senha, setSenha] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function cancel() {
    setSenha("");
    setError("");
    onCancel();
  }

  async function unlock() {
    if (!senha) {
      setError("Informe a senha.");
      return;
    }

    setLoading(true);
    setError("");
    const result = await api.unlockGeneral(token, { senha });
    setLoading(false);

    if (result.ok) {
      setSenha("");
      setError("");
      onSuccess(result.data);
      return;
    }

    if (result.status === 401) {
      setError("Senha incorreta.");
      return;
    }

    setError(getErrorMessage(result, "Nao foi possivel liberar o General."));
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={cancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Liberar General</Text>
          <Text style={styles.subtitle}>Digite sua senha para acessar o modo de planejamento.</Text>

          <TextInput
            onBlur={() => setFocused(false)}
            onChangeText={setSenha}
            onFocus={() => setFocused(true)}
            placeholder="Senha"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={[styles.input, focused && styles.inputFocused]}
            value={senha}
          />

          <StatusNotice type="error" message={error} />

          <Pressable disabled={loading} onPress={unlock} style={styles.button}>
            {loading ? (
              <ActivityIndicator color={colors.black} />
            ) : (
              <Text style={styles.buttonText}>LIBERAR GENERAL</Text>
            )}
          </Pressable>

          <Pressable disabled={loading} onPress={cancel}>
            <Text style={styles.cancel}>CANCELAR</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
  },
  card: {
    width: "85%",
    backgroundColor: colors.bgElevated,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.cardPad,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 16,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
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
    height: layout.actionButtonHeight,
    justifyContent: "center",
    marginTop: spacing.sm,
    width: layout.fullWidth,
  },
  buttonText: {
    ...typography.label,
    color: colors.black,
    fontWeight: "700",
  },
  cancel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
