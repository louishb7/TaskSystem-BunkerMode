import { StyleSheet, View } from "react-native";
import { tokens } from "@/design/tokens";
import { BMText } from "./BMText";

export function EmptyState({ message, title }: { message: string; title: string }) {
  return (
    <View style={styles.state}>
      <BMText kicker>SEM DADOS</BMText>
      <BMText title style={styles.title}>
        {title}
      </BMText>
      <BMText muted>{message}</BMText>
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    backgroundColor: tokens.colors.surfaceDeep,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    gap: tokens.spacing.sm,
    padding: tokens.spacing.xl,
  },
  title: {
    fontSize: 20,
    lineHeight: 25,
  },
});
