import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

const backgrounds = {
  general: require("../assets/bunkermode/backgrounds/general/bg_general_concrete.png"),
  login: require("../assets/bunkermode/backgrounds/login/bg_login_main.png"),
  soldier: require("../assets/bunkermode/backgrounds/soldier/bg_soldier_tactical.png"),
};
const grid = require("../assets/bunkermode/effects/tactical_grid.png");
const noise = require("../assets/bunkermode/effects/noise_texture.png");

export default function BunkerBackground({ dense = false, variant = "general" }) {
  const soldier = variant === "soldier";
  const login = variant === "login";
  const backgroundSource = backgrounds[variant] || backgrounds.general;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.root,
        soldier && styles.soldierRoot,
        login && styles.loginRoot,
      ]}
    >
      <ImageBackground
        imageStyle={[
          styles.textureImage,
          soldier && styles.soldierTexture,
          login && styles.loginTexture,
          dense && styles.textureDense,
        ]}
        resizeMode="repeat"
        source={backgroundSource}
        style={styles.texture}
      />
      <ImageBackground imageStyle={styles.noiseImage} resizeMode="repeat" source={noise} style={styles.texture} />
      {soldier ? null : (
        <ImageBackground imageStyle={styles.gridImage} resizeMode="cover" source={grid} style={styles.texture} />
      )}
      <View style={[styles.scrim, soldier && styles.soldierScrim, login && styles.loginScrim]} />
      <View style={[styles.vignetteTop, soldier && styles.soldierVignetteTop]} />
      <View style={styles.vignetteBottom} />
      <View style={[styles.wallLight, soldier && styles.wallLightSoldier]} />
      <View style={styles.verticalLineLeft} />
      <View style={styles.verticalLineRight} />
      <View style={styles.horizontalLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.generalCanvas,
    overflow: "hidden",
  },
  soldierRoot: {
    backgroundColor: theme.colors.soldierCanvas,
  },
  loginRoot: {
    backgroundColor: theme.colors.loginCanvas,
  },
  texture: {
    ...StyleSheet.absoluteFillObject,
  },
  textureImage: {
    opacity: 0.46,
  },
  textureDense: {
    opacity: 0.6,
  },
  soldierTexture: {
    opacity: 0.12,
  },
  loginTexture: {
    opacity: 0.2,
  },
  noiseImage: {
    opacity: 0.08,
  },
  gridImage: {
    opacity: 0.08,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.scrim,
  },
  soldierScrim: {
    backgroundColor: theme.colors.soldierScrim,
  },
  loginScrim: {
    backgroundColor: theme.colors.loginScrim,
  },
  vignetteTop: {
    backgroundColor: "rgba(91,53,36,0.22)",
    height: 120,
    left: 0,
    opacity: 0.8,
    position: "absolute",
    right: 0,
    top: 0,
  },
  soldierVignetteTop: {
    backgroundColor: "rgba(255,42,42,0.05)",
  },
  vignetteBottom: {
    backgroundColor: "rgba(182,138,58,0.08)",
    bottom: 0,
    height: 160,
    left: 0,
    position: "absolute",
    right: 0,
  },
  wallLight: {
    backgroundColor: "rgba(245,240,232,0.05)",
    height: 180,
    left: -60,
    position: "absolute",
    right: -60,
    top: 82,
    transform: [{ rotate: "-5deg" }],
  },
  wallLightSoldier: {
    backgroundColor: "rgba(255,42,42,0.025)",
  },
  verticalLineLeft: {
    backgroundColor: "rgba(245,240,232,0.08)",
    bottom: 0,
    left: 18,
    position: "absolute",
    top: 0,
    width: 1,
  },
  verticalLineRight: {
    backgroundColor: "rgba(245,240,232,0.08)",
    bottom: 0,
    position: "absolute",
    right: 18,
    top: 0,
    width: 1,
  },
  horizontalLine: {
    backgroundColor: "rgba(245,240,232,0.08)",
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
    top: 120,
  },
});
