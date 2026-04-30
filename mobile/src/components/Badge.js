import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, surfaces, typography } from "../styles/tokens";
import { generalTheme } from "../styles/generalTheme";

const commandColors = generalTheme.colors;

function getStatusStyle(label) {
  const statusStyles = {
    Pendente: {
      backgroundColor: colors.bgCard,
      borderColor: colors.borderStrong,
      color: colors.textSecondary,
    },
    "Falha aguardando justificativa": {
      backgroundColor: surfaces.redBg,
      borderColor: colors.red,
      color: colors.red,
    },
    "Falha justificada aguardando revisão": {
      backgroundColor: surfaces.amberBg,
      borderColor: colors.red,
      color: colors.red,
    },
    "Falha revisada": {
      backgroundColor: surfaces.redBg,
      borderColor: colors.red,
      color: colors.red,
    },
    "Concluída": {
      backgroundColor: colors.bgCard,
      borderColor: colors.textPrimary,
      color: colors.textPrimary,
    },
  };

  const selected = statusStyles[label];
  if (selected) {
    return {
      ...selected,
      label,
    };
  }

  return {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderStrong,
    color: colors.textSecondary,
    label: label || "",
  };
}

export default function Badge({ type, label, tone = "default" }) {
  const selected =
    type === "decided"
      ? {
          backgroundColor: tone === "command" ? commandColors.decisionSurface : surfaces.amberBg,
          borderColor: tone === "command" ? commandColors.decisionBorder : colors.red,
          color: tone === "command" ? commandColors.decisionText : colors.red,
          label: "DECIDIDA",
        }
      : getStatusStyle(label);

  if (!selected.label) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: selected.backgroundColor,
          borderColor: selected.borderColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: selected.color }]}>{selected.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: layout.tagPadH,
    paddingVertical: layout.tagPadV,
  },
  text: {
    ...typography.small,
    fontWeight: "600",
  },
});
