import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, type ViewStyle } from "react-native";
import { StatusBar } from "expo-status-bar";
import { tokens } from "@/design/tokens";

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
};

export function Screen({ children, scroll = true, style }: ScreenProps) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={[styles.content, style]}>{children}</ScrollView>
  ) : (
    <>{children}</>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.colors.canvas,
    flex: 1,
  },
  content: {
    gap: tokens.spacing.lg,
    padding: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xxl,
  },
});
