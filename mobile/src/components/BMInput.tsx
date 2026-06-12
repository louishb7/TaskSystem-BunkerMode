import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { tokens } from "@/design/tokens";
import { BMText } from "./BMText";

type BMInputProps = TextInputProps & {
  label: string;
};

export function BMInput({ label, style, ...props }: BMInputProps) {
  return (
    <View style={styles.field}>
      <BMText kicker>{label}</BMText>
      <TextInput
        {...props}
        placeholderTextColor={tokens.colors.textDim}
        style={[styles.input, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: tokens.spacing.sm,
  },
  input: {
    backgroundColor: tokens.colors.surfaceDeep,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    color: tokens.colors.text,
    minHeight: 48,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
});
