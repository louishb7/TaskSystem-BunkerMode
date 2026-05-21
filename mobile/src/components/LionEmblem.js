import React from "react";
import { Image, StyleSheet, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

const lionAsset = require("../assets/bunkermode/web/emblems/leao-do-dia.png");

export default function LionEmblem({ compact = false, size }) {
  const frameSize = size || (compact ? 76 : 112);

  return (
    <View style={[styles.root, { height: frameSize, width: frameSize }]}>
      <View style={[styles.ring, { borderRadius: frameSize / 2 }]} />
      <Image resizeMode="contain" source={lionAsset} style={styles.image} />
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
  image: {
    height: "82%",
    opacity: 0.94,
    width: "82%",
  },
});
