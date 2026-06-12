import { ActivityIndicator, StyleSheet, View } from "react-native";
import { tokens } from "@/design/tokens";
import { BMText } from "./BMText";

export function LoadingState({ message = "Sincronizando dados." }: { message?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={tokens.colors.fire} />
      <BMText muted>{message}</BMText>
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: "center",
    gap: tokens.spacing.md,
    padding: tokens.spacing.xl,
  },
});
