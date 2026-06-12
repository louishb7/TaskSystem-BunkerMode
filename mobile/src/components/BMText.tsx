import { Text, type TextProps, StyleSheet } from "react-native";
import { tokens } from "@/design/tokens";

type BMTextProps = TextProps & {
  muted?: boolean;
  kicker?: boolean;
  title?: boolean;
};

export function BMText({ children, kicker, muted, style, title, ...props }: BMTextProps) {
  return (
    <Text
      {...props}
      style={[styles.base, muted && styles.muted, kicker && styles.kicker, title && styles.title, style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: tokens.colors.text,
    fontSize: 15,
    lineHeight: tokens.typography.bodyLineHeight,
  },
  kicker: {
    color: tokens.colors.fire,
    fontSize: 11,
    fontWeight: tokens.typography.labelWeight,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  muted: {
    color: tokens.colors.textMuted,
  },
  title: {
    color: tokens.colors.text,
    fontSize: 28,
    fontWeight: tokens.typography.titleWeight,
    lineHeight: 34,
    textTransform: "uppercase",
  },
});
