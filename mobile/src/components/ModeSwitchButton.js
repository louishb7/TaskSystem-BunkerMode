import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

export default function ModeSwitchButton({
  disabled = false,
  loading = false,
  mode = "general",
  onPress,
}) {
  const soldier = mode === "soldier";

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        soldier ? styles.generalButton : styles.soldierButton,
        (pressed || disabled || loading) && styles.pressed,
      ]}
    >
      <View style={styles.copy}>
        {!soldier ? <Text style={styles.kicker}>FOCO OPERACIONAL</Text> : null}
        <Text style={[styles.label, soldier && styles.labelSoldier]}>
          {soldier ? "RETORNAR AO COMANDO" : "ENTRAR EM FOCO"}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator color={soldier ? theme.colors.text : theme.colors.black} />
      ) : (
        <Text style={[styles.marker, soldier && styles.markerSoldier]}>
          {soldier ? "GENERAL" : "ENTRAR"}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  soldierButton: {
    backgroundColor: theme.colors.fire,
    borderColor: theme.colors.fire,
    ...theme.shadow.fire,
  },
  generalButton: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.borderStrong,
  },
  pressed: {
    opacity: 0.72,
  },
  copy: {
    flex: 1,
    gap: theme.spacing.xs,
    minWidth: 0,
  },
  kicker: {
    ...theme.typography.small,
    color: theme.colors.fireDark,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.black,
    fontSize: 14,
  },
  labelSoldier: {
    color: theme.colors.text,
  },
  marker: {
    ...theme.typography.small,
    color: theme.colors.fireDark,
  },
  markerSoldier: {
    color: theme.colors.fire,
  },
});
