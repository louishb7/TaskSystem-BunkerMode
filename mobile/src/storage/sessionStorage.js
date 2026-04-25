import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "bunkermode_mobile_token";
const USER_KEY = "bunkermode_mobile_user";

export async function loadSession() {
  const [token, rawUser] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(USER_KEY),
  ]);

  if (!token || !rawUser) {
    return { token: null, user: null };
  }

  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    await clearSession();
    return { token: null, user: null };
  }
}

export async function saveSession(token, user) {
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, token),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  ]);
}

export async function saveUser(user) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
}
