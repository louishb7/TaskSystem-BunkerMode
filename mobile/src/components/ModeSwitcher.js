import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, spacing, typography } from "../styles/tokens";

export default function ModeSwitcher({
  disabled = false,
  mode,
  onPress,
  pending = false,
}) {
  const soldier = mode === "soldier";

  return (
    <View style={[styles.container, soldier && styles.soldierContainer]}>
      <View>
        <Text style={styles.kicker}>{soldier ? "MODO RESTRITO" : "POSTO DE COMANDO"}</Text>
        <Text style={styles.mode}>{soldier ? "SOLDADO" : "GENERAL"}</Text>
      </View>
      <Pressable
        disabled={disabled || pending}
        onPress={onPress}
        style={[styles.button, soldier ? styles.generalButton : styles.soldierButton]}
      >
        {pending ? (
          <ActivityIndicator color={soldier ? colors.textPrimary : colors.black} />
        ) : (
          <Text style={[styles.buttonText, soldier ? styles.generalText : styles.soldierText]}>
            {soldier ? "LIBERAR GENERAL" : "ATIVAR SOLDADO"}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderColor: colors.red,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 70,
    padding: spacing.md,
  },
  soldierContainer: {
    backgroundColor: colors.black,
    borderColor: colors.borderStrong,
  },
  kicker: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: "700",
  },
  mode: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginTop: spacing.xs,
  },
  button: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    height: layout.actionButtonHeight,
    justifyContent: "center",
    minWidth: 132,
    paddingHorizontal: spacing.md,
  },
  soldierButton: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  generalButton: {
    backgroundColor: colors.transparent,
    borderColor: colors.textMuted,
  },
  buttonText: {
    ...typography.label,
    fontWeight: "900",
  },
  soldierText: {
    color: colors.black,
  },
  generalText: {
    color: colors.textSecondary,
  },
});
