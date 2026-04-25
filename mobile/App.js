import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from "react-native";

import LoginScreen from "./src/screens/LoginScreen";
import SoldierHomeScreen from "./src/screens/SoldierHomeScreen";
import { clearSession, loadSession, saveSession } from "./src/storage/sessionStorage";
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
    setToken(session.token);
    setUser(session.user);
    setBooting(false);
  }

  async function handleAuthenticated(nextToken, nextUser) {
    await saveSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }

  async function handleLogout() {
    await clearSession();
    setToken(null);
    setUser(null);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {token && user ? (
        <SoldierHomeScreen token={token} user={user} onLogout={handleLogout} onUserChange={setUser} />
      ) : (
        <LoginScreen onAuthenticated={handleAuthenticated} />
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
