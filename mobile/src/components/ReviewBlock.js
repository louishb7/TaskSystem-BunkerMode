import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../styles/tokens";
import ReviewCard from "./ReviewCard";
import StatusNotice from "./StatusNotice";

export default function ReviewBlock({ missions, onLogout, onReload, token }) {
  if (!missions?.length) {
    return (
      <View style={styles.empty}>
        <StatusNotice type="info" message="Nenhuma falha aguardando revisao." />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.warning}>REVISAO OBRIGATORIA</Text>
      {missions.map((mission, index) => (
        <ReviewCard
          key={String(mission?.id ?? index)}
          mission={mission}
          token={token}
          onLogout={onLogout}
          onReload={onReload}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  warning: {
    ...typography.small,
    color: colors.red,
    fontWeight: "900",
    marginBottom: spacing.sm,
  },
  empty: {
    marginBottom: -spacing.md,
  },
});
