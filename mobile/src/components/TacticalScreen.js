import React from "react";
import { StyleSheet, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";
import BunkerBackground from "./BunkerBackground";

export default function TacticalScreen({
  children,
  denseBackground = false,
  style,
  variant = "general",
}) {
  return (
    <View style={[styles.root, variant === "soldier" && styles.soldierRoot, style]}>
      <BunkerBackground dense={denseBackground} variant={variant} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.generalCanvas,
    flex: 1,
  },
  soldierRoot: {
    backgroundColor: theme.colors.soldierCanvas,
  },
});
