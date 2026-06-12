import { Redirect, Tabs } from "expo-router";
import { LoadingState } from "@/components/LoadingState";
import { Screen } from "@/components/Screen";
import { tokens } from "@/design/tokens";
import { useAuth } from "@/hooks/useAuth";

export default function TabsLayout() {
  const { authenticated, booting } = useAuth();

  if (booting) {
    return (
      <Screen scroll={false}>
        <LoadingState message="Abrindo operação." />
      </Screen>
    );
  }

  if (!authenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      initialRouteName="soldado"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.colors.fire,
        tabBarInactiveTintColor: tokens.colors.textDim,
        tabBarStyle: {
          backgroundColor: tokens.colors.surfaceDeep,
          borderTopColor: tokens.colors.border,
        },
      }}
    >
      <Tabs.Screen name="soldado" options={{ title: "Soldado" }} />
      <Tabs.Screen name="general" options={{ title: "General" }} />
      <Tabs.Screen name="montanha" options={{ title: "Montanha" }} />
      <Tabs.Screen name="ajustes" options={{ title: "Ajustes" }} />
    </Tabs>
  );
}
