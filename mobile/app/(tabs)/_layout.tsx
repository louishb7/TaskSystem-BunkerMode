import { Redirect, Tabs, usePathname } from "expo-router";
import { LoadingState } from "@/components/LoadingState";
import { Screen } from "@/components/Screen";
import { tokens } from "@/design/tokens";
import { useAuth } from "@/hooks/useAuth";

export default function TabsLayout() {
  const { activeMode, authenticated, booting } = useAuth();
  const pathname = usePathname();

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

  if (activeMode === "soldier" && !pathname.includes("/soldado")) {
    return <Redirect href="/(tabs)/soldado" />;
  }

  if (activeMode !== "soldier" && pathname.includes("/soldado")) {
    return <Redirect href="/(tabs)/general" />;
  }

  return (
    <Tabs
      initialRouteName={activeMode === "soldier" ? "soldado" : "general"}
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
      <Tabs.Screen name="soldado" options={{ href: activeMode === "soldier" ? undefined : null, title: "Soldado" }} />
      <Tabs.Screen name="general" options={{ href: activeMode === "soldier" ? null : undefined, title: "General" }} />
      <Tabs.Screen name="montanha" options={{ href: activeMode === "soldier" ? null : undefined, title: "Montanha" }} />
      <Tabs.Screen name="ajustes" options={{ href: activeMode === "soldier" ? null : undefined, title: "Ajustes" }} />
    </Tabs>
  );
}
