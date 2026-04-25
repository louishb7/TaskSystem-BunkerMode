import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, surfaces, typography } from "../styles/tokens";

function getStatusStyle(label) {
  const normalized = String(label || "").toLowerCase();

  if (normalized.includes("conclu")) {
    return {
      backgroundColor: surfaces.blueBg,
      borderColor: colors.blue,
      color: colors.blue,
      label: label || "",
    };
  }

  if (normalized.includes("justific")) {
    return {
      backgroundColor: surfaces.amberBg,
      borderColor: colors.amber,
      color: colors.amber,
      label: label || "",
    };
  }

  if (normalized.includes("expir") || normalized.includes("falha")) {
    return {
      backgroundColor: surfaces.redBg,
      borderColor: colors.red,
      color: colors.red,
      label: label || "",
    };
  }

  if (normalized.includes("pendent") || normalized.includes("aguard")) {
    return {
      backgroundColor: surfaces.greenBg,
      borderColor: colors.green,
      color: colors.green,
      label: label || "",
    };
  }

  return {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderStrong,
    color: colors.textSecondary,
    label: label || "",
  };
}

export default function Badge({ type, label }) {
  const selected =
    type === "decided"
      ? {
          backgroundColor: surfaces.amberBg,
          borderColor: colors.amber,
          color: colors.amber,
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
