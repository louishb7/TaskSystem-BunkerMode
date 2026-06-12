import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { tokens } from "@/design/tokens";
import { BMText } from "./BMText";

type BMButtonProps = Omit<PressableProps, "style"> & {
  label: string;
  style?: StyleProp<ViewStyle>;
  variant?: "fire" | "secondary" | "danger";
};

export function BMButton({ disabled, label, style, variant = "fire", ...props }: BMButtonProps) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <BMText style={[styles.label, variant === "secondary" && styles.secondaryLabel]}>{label}</BMText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.lg,
  },
  danger: {
    backgroundColor: tokens.colors.dangerWash,
    borderColor: tokens.colors.danger,
  },
  disabled: {
    opacity: 0.55,
  },
  fire: {
    backgroundColor: tokens.colors.fireWash,
    borderColor: tokens.colors.fireBorder,
  },
  label: {
    color: tokens.colors.fire,
    fontSize: 13,
    fontWeight: tokens.typography.labelWeight,
    textTransform: "uppercase",
  },
  pressed: {
    opacity: 0.82,
  },
  secondary: {
    backgroundColor: tokens.colors.surfaceDeep,
    borderColor: tokens.colors.borderStrong,
  },
  secondaryLabel: {
    color: tokens.colors.text,
  },
});
