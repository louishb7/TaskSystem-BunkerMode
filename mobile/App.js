import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { api } from "./src/api/client";
import GeneralStack from "./src/navigation/GeneralStack";
import SoldierStack from "./src/navigation/SoldierStack";
import LoginScreen from "./src/screens/LoginScreen";
import { clearSession, loadSession, saveSession, saveUser } from "./src/storage/sessionStorage";
import { colors, spacing } from "./src/styles/tokens";

export default function App() {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    const session = await loadSession();
    if (!session.token) {
      setToken(null);
      setUser(null);
      setBooting(false);
      return;
    }

    const result = await api.getCurrentUser(session.token);
    if (result.ok) {
      await saveUser(result.data);
      setToken(session.token);
      setUser(result.data);
    } else if (result.status === 401) {
      await clearSession();
      setToken(null);
      setUser(null);
    } else {
      setToken(session.token);
      setUser(null);
    }
    setBooting(false);
  }

  async function handleAuthenticated(nextToken, nextUser) {
    await saveSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }

  async function handleUserChange(nextUser) {
    await saveUser(nextUser);
    setUser(nextUser);
  }

  async function handleLogout() {
    await clearSession();
    setToken(null);
    setUser(null);
  }

  let content;
  if (booting) {
    content = (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.amber} />
      </View>
    );
  } else if (!token || !user) {
    content = (
      <LoginScreen onAuthenticated={handleAuthenticated} />
    );
  } else if (user.active_mode === "general") {
    content = (
      <GeneralStack
        token={token}
        user={user}
        onLogout={handleLogout}
        onUserChange={handleUserChange}
      />
    );
  } else {
    content = (
      <SoldierStack
        token={token}
        user={user}
        onLogout={handleLogout}
        onUserChange={handleUserChange}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={[styles.safeArea, user?.active_mode === "soldier" && styles.soldierSafeArea]}
      >
        {content}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  soldierSafeArea: {
    backgroundColor: "#000000",
  },
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.screenH,
  },
});
