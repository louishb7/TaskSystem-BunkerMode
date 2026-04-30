import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../styles/tokens";
import ReviewCard from "./ReviewCard";
import StatusNotice from "./StatusNotice";

export default function ReviewBlock({ missions, onLogout, onReload, token, tone = "default" }) {
  const command = tone === "command";

  if (!missions?.length) {
    return (
      <View style={[styles.empty, command && styles.commandEmpty]}>
        {command ? (
          <Text style={styles.commandEmptyText}>Nenhuma falha aguardando revisão.</Text>
        ) : (
          <StatusNotice type="info" message="Nenhuma falha aguardando revisão." />
        )}
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.warning}>REVISÃO OBRIGATÓRIA</Text>
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
  commandEmpty: {
    backgroundColor: "#F7F8F2",
    borderColor: "#C8D0C3",
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
  },
  commandEmptyText: {
    ...typography.notice,
    color: "#5E6A5F",
  },
});
