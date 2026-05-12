import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import ReviewPanel from "../components/ReviewPanel";
import SectionHeader from "../components/SectionHeader";
import TacticalPanel from "../components/TacticalPanel";
import TacticalScreen from "../components/TacticalScreen";
import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

export default function GeneralReviewScreen({
  allMissions,
  bottomPadding,
  missions,
  onBack,
  onCloseReview,
  onLogout,
  onReload,
  reviewState,
  token,
  weeklyReviews,
}) {
  return (
    <TacticalScreen variant="general">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPadding + theme.spacing.xl },
        ]}
      >
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>VOLTAR AO COMANDO</Text>
        </Pressable>

        <TacticalPanel elevated style={styles.headerPanel}>
          <SectionHeader
            eyebrow="RELATÓRIO"
            tone="fire"
            title="Leitura da execução"
            meta="Revise o período, identifique falhas reais e decida apenas o que exige comando."
          />
        </TacticalPanel>

        <ReviewPanel
          allMissions={allMissions}
          missions={missions}
          onCloseReview={onCloseReview}
          onLogout={onLogout}
          onReload={onReload}
          reviewState={reviewState}
          token={token}
          weeklyReviews={weeklyReviews}
        />
      </ScrollView>
    </TacticalScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.screen,
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
  },
  backText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  headerPanel: {
    marginBottom: theme.spacing.md,
  },
});
