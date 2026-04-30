import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";

import { generalTheme } from "../../styles/generalTheme";

const commandColors = generalTheme.colors;
const bunkerTexture = require("../../assets/bunkermode/backgrounds/bg_bunker_reference.png");

export default function GeneralAssetBackground() {
  return (
    <View pointerEvents="none" style={styles.root}>
      <ImageBackground source={bunkerTexture} resizeMode="repeat" style={styles.texture} imageStyle={styles.textureImage} />
      <View style={styles.scrim} />
      <View style={styles.mapLineTop} />
      <View style={styles.mapLineBottom} />
      <View style={styles.diagonal} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: commandColors.canvas,
    overflow: "hidden",
  },
  texture: {
    ...StyleSheet.absoluteFillObject,
  },
  textureImage: {
    opacity: 0.06,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: commandColors.overlay,
  },
  mapLineTop: {
    backgroundColor: commandColors.boardLine,
    height: 1,
    left: 20,
    opacity: 0.44,
    position: "absolute",
    right: 20,
    top: 104,
  },
  mapLineBottom: {
    backgroundColor: commandColors.boardLine,
    height: 1,
    left: 40,
    opacity: 0.28,
    position: "absolute",
    right: 36,
    top: 108,
  },
  diagonal: {
    backgroundColor: commandColors.boardLine,
    height: 1,
    opacity: 0.2,
    position: "absolute",
    right: -80,
    top: 210,
    transform: [{ rotate: "-32deg" }],
    width: 260,
  },
});
