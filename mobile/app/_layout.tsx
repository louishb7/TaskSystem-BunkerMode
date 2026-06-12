import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { AuthProvider } from "@/auth/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: "#090a0a" },
          headerShown: false,
        }}
      />
    </AuthProvider>
  );
}
