import { Redirect } from "expo-router";
import { LoadingState } from "@/components/LoadingState";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/hooks/useAuth";

export default function IndexRoute() {
  const { activeMode, authenticated, booting } = useAuth();

  if (booting) {
    return (
      <Screen scroll={false} style={{ justifyContent: "center" }}>
        <LoadingState message="Confirmando sessão." />
      </Screen>
    );
  }

  if (!authenticated) {
    return <Redirect href="/login" />;
  }

  return <Redirect href={activeMode === "soldier" ? "/(tabs)/soldado" : "/(tabs)/general"} />;
}
