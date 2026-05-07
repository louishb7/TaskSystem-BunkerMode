import React from "react";
import { Image, StyleSheet, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

const dualitySymbol = require("../assets/bunkermode/branding/duality_symbol.png");

export default function BrandSymbol({ muted = false, size = 64, style }) {
  return (
    <View
      style={[
        styles.frame,
        muted && styles.muted,
        {
          height: size,
          width: size,
        },
        style,
      ]}
    >
      <Image
        resizeMode="cover"
        source={dualitySymbol}
        style={{
          height: size,
          width: size,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  muted: {
    opacity: 0.7,
  },
});
