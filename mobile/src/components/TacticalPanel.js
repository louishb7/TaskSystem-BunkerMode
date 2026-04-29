import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "../styles/tokens";

const bunkerBackground = require("../assets/bunkermode/backgrounds/bg_bunker_reference.png");

export default function TacticalPanel({
  children,
  danger = false,
  muted = false,
  style,
  textured = false,
}) {
  const panelStyle = [
    styles.panel,
    danger && styles.danger,
    muted && styles.muted,
    style,
  ];

  if (textured) {
    return (
      <ImageBackground
        imageStyle={styles.texture}
        resizeMode="cover"
        source={bunkerBackground}
        style={panelStyle}
      >
        <View style={styles.textureShade}>{children}</View>
      </ImageBackground>
    );
  }

  return <View style={panelStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    padding: spacing.cardPad,
  },
  danger: {
    borderColor: colors.red,
  },
  muted: {
    backgroundColor: colors.black,
    borderColor: colors.borderSubtle,
  },
  texture: {
    opacity: 0.16,
  },
  textureShade: {
    backgroundColor: "rgba(0,0,0,0.72)",
    flex: 1,
    margin: -spacing.cardPad,
    padding: spacing.cardPad,
  },
});
