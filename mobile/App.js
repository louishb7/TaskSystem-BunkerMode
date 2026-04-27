import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from "react-native";

import GeneralDashboardScreen from "./src/screens/GeneralDashboardScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SoldierHomeScreen from "./src/screens/SoldierHomeScreen";
import { clearSession, loadSession, saveSession, saveUser } from "./src/storage/sessionStorage";
import { colors, spacing } from "./src/styles/tokens";

function screenForUser(nextUser) {
  return nextUser?.active_mode === "general" ? "general" : "soldier";
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState("login");

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    const session = await loadSession();
    setToken(session.token);
    setUser(session.user);
    setCurrentScreen(session.token && session.user ? screenForUser(session.user) : "login");
    setBooting(false);
  }

  async function handleAuthenticated(nextToken, nextUser) {
    await saveSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
    setCurrentScreen(screenForUser(nextUser));
  }

  async function handleUserChange(nextUser) {
    await saveUser(nextUser);
    setUser(nextUser);
  }

  async function handleLogout() {
    await clearSession();
    setToken(null);
    setUser(null);
    setCurrentScreen("login");
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.boot}>
          <ActivityIndicator color={colors.amber} />
        </View>
      </SafeAreaView>
    );
  }

  if (!token || !user || currentScreen === "login") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoginScreen onAuthenticated={handleAuthenticated} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {currentScreen === "general" ? (
        <GeneralDashboardScreen
          token={token}
          user={user}
          onActivateSoldier={() => setCurrentScreen("soldier")}
          onLogout={handleLogout}
          onUserChange={handleUserChange}
        />
      ) : (
        <SoldierHomeScreen
          token={token}
          user={user}
          onLogout={handleLogout}
          onSwitchToGeneral={() => setCurrentScreen("general")}
          onUserChange={handleUserChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.screenH,
  },
});
