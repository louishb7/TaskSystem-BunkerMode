import React from "react";
import { Image, StyleSheet, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

const dualitySymbol = require("../assets/bunkermode/branding/duality_symbol.png");

export default function BrandSymbol({ muted = false, size = 64, style }) {
  const imageSize = Math.max(1, size - 8);

  return (
    <View
      style={[
        styles.frame,
        muted && styles.muted,
        {
          height: size,
          borderRadius: size / 2,
          width: size,
        },
        style,
      ]}
    >
      <Image
        resizeMode="contain"
        source={dualitySymbol}
        style={{
          borderRadius: imageSize / 2,
          height: imageSize,
          width: imageSize,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderColor: "rgba(255,138,42,0.18)",
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
    padding: 4,
    ...theme.shadow.fire,
  },
  muted: {
    opacity: 0.7,
  },
});
