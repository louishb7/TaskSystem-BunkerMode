import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { generalTheme } from "../../styles/generalTheme";
import { radius, spacing, typography } from "../../styles/tokens";

const commandColors = generalTheme.colors;

export default function GeneralTransitionPanel({ hasReview, loading, onActivate }) {
  return (
    <View style={styles.panel}>
      <View style={styles.copy}>
        <Text style={styles.kicker}>TRANSIÇÃO DE MODO</Text>
        <Text style={styles.title}>Entregar ordens ao Soldado</Text>
        <Text style={styles.text}>
          {hasReview
            ? "Há revisão pendente. A entrega continua disponível, mas a prioridade operacional é decidir a falha."
            : "Quando o plano estiver pronto, mude para execução sem renegociar."}
        </Text>
      </View>
      <Pressable
        disabled={loading}
        onPress={onActivate}
        style={[styles.button, hasReview && styles.buttonDeferred, loading && styles.buttonDisabled]}
      >
        {loading ? (
          <ActivityIndicator color={hasReview ? commandColors.accentDark : commandColors.white} />
        ) : (
          <Text style={[styles.buttonText, hasReview && styles.buttonTextDeferred]}>
            ATIVAR SOLDADO
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: commandColors.panelMuted,
    borderColor: commandColors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  copy: {
    marginBottom: spacing.md,
  },
  kicker: {
    ...typography.small,
    color: commandColors.muted,
    fontWeight: "900",
  },
  title: {
    color: commandColors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: spacing.xs,
  },
  text: {
    color: commandColors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  button: {
    alignItems: "center",
    backgroundColor: commandColors.soldier,
    borderColor: commandColors.soldier,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  buttonDeferred: {
    backgroundColor: commandColors.panel,
    borderColor: commandColors.borderStrong,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...typography.label,
    color: commandColors.white,
    fontWeight: "900",
  },
  buttonTextDeferred: {
    color: commandColors.accentDark,
  },
});
