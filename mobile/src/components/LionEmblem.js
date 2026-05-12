import React from "react";
import { StyleSheet, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

export default function LionEmblem({ compact = false, size }) {
  const frameSize = size || (compact ? 76 : 112);
  const coreWidth = frameSize * 0.5;
  const coreHeight = frameSize * 0.56;
  const helmetWidth = frameSize * 0.56;

  return (
    <View style={[styles.root, { height: frameSize, width: frameSize }]}>
      <View style={[styles.ring, { borderRadius: frameSize / 2 }]} />
      <View
        style={[
          styles.helmet,
          {
            borderTopLeftRadius: helmetWidth / 2,
            borderTopRightRadius: helmetWidth / 2,
            height: frameSize * 0.28,
            top: frameSize * 0.22,
            width: helmetWidth,
          },
        ]}
      />
      <View
        style={[
          styles.core,
          {
            borderBottomLeftRadius: coreWidth * 0.26,
            borderBottomRightRadius: coreWidth * 0.26,
            borderTopLeftRadius: coreWidth * 0.18,
            borderTopRightRadius: coreWidth * 0.18,
            height: coreHeight,
            top: frameSize * 0.3,
            width: coreWidth,
          },
        ]}
      >
        <View style={[styles.brow, { top: coreHeight * 0.34, width: coreWidth * 0.56 }]} />
        <View style={[styles.eye, styles.eyeLeft, { top: coreHeight * 0.43 }]} />
        <View style={[styles.eye, styles.eyeRight, { top: coreHeight * 0.43 }]} />
        <View style={[styles.mark, { bottom: coreHeight * 0.16 }]} />
        <View style={[styles.jaw, { bottom: coreHeight * 0.09, width: coreWidth * 0.42 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...theme.shadow.fire,
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,138,42,0.05)",
    borderColor: theme.colors.fireBorder,
    borderWidth: 1,
  },
  helmet: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderColor: "rgba(255,138,42,0.34)",
    borderTopColor: "rgba(255,138,42,0.72)",
    borderTopWidth: 2,
    borderWidth: 1,
    position: "absolute",
  },
  core: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: "rgba(255,138,42,0.70)",
    borderWidth: 1,
    overflow: "hidden",
    position: "absolute",
  },
  brow: {
    backgroundColor: "rgba(255,138,42,0.58)",
    height: 1,
    position: "absolute",
  },
  eye: {
    backgroundColor: theme.colors.fire,
    height: 3,
    position: "absolute",
    width: 8,
  },
  eyeLeft: {
    left: "30%",
    transform: [{ rotate: "12deg" }],
  },
  eyeRight: {
    right: "30%",
    transform: [{ rotate: "-12deg" }],
  },
  mark: {
    borderBottomColor: theme.colors.fire,
    borderBottomWidth: 1,
    borderRightColor: theme.colors.fire,
    borderRightWidth: 1,
    height: 18,
    position: "absolute",
    transform: [{ rotate: "45deg" }],
    width: 16,
  },
  jaw: {
    borderBottomColor: "rgba(255,138,42,0.62)",
    borderBottomWidth: 1,
    borderRadius: 18,
    height: 10,
    position: "absolute",
  },
});
