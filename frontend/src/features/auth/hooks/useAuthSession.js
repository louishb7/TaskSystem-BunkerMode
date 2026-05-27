import { useEffect, useState } from "react";

import { getErrorMessage } from "../../../api/httpClient.js";
import { TOKEN_KEY, USER_KEY } from "../../../constants/session.js";
import { emptyStatus } from "../../../constants/uiState.js";
import { api } from "../../../services/bunkermodeApi.js";

function readStoredUser() {
  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function useAuthSession() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [booting, setBooting] = useState(Boolean(token));
  const [authStatus, setAuthStatus] = useState(emptyStatus);
  const [authLoading, setAuthLoading] = useState(false);

  const authenticated = Boolean(token && user);
  const activeMode = user?.active_mode || "general";

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }

    restoreSession();
  }, [token]);

  function persistUser(nextUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setAuthStatus(emptyStatus);
    setBooting(false);
  }

  function handleUnauthorized(result) {
    if (result?.status === 401) {
      clearSession();
      setAuthStatus({ type: "error", message: "Sessão expirada. Faça login novamente." });
      return true;
    }
    return false;
  }

  async function restoreSession() {
    setBooting(true);
    const result = await api.getCurrentUser(token);
    setBooting(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      clearSession();
      setAuthStatus({
        type: "error",
        message: getErrorMessage(result, "Sessão não confirmada. Entre novamente."),
      });
      return;
    }

    persistUser(result.data);
  }

  async function login(payload) {
    if (!payload.email || !payload.senha) {
      setAuthStatus({ type: "error", message: "Preencha e-mail ou usuário e senha." });
      return;
    }

    setAuthLoading(true);
    setAuthStatus(emptyStatus);
    const result = await api.login(payload);
    setAuthLoading(false);

    if (!result.ok) {
      setAuthStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível entrar no bunker."),
      });
      return;
    }

    localStorage.setItem(TOKEN_KEY, result.data.access_token);
    setToken(result.data.access_token);
    persistUser(result.data.usuario);
  }

  async function register(payload) {
    if (!payload.usuario || !payload.email || !payload.senha) {
      setAuthStatus({ type: "error", message: "Preencha usuário, e-mail e senha." });
      return;
    }

    setAuthLoading(true);
    setAuthStatus(emptyStatus);
    const result = await api.register(payload);
    setAuthLoading(false);

    if (!result.ok) {
      setAuthStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível criar a conta."),
      });
      return;
    }

    setAuthStatus({ type: "success", message: "Conta criada. Entre no bunker para continuar." });
  }

  function syncUserFromServer(nextUser) {
    persistUser(nextUser);
  }

  async function reloadCurrentUser(expectedMode = null) {
    const result = await api.getCurrentUser(token);

    if (handleUnauthorized(result)) {
      return null;
    }

    if (!result.ok) {
      setAuthStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível recarregar o usuário."),
      });
      return null;
    }

    if (expectedMode && result.data?.active_mode !== expectedMode) {
      setAuthStatus({
        type: "error",
        message: "Modo ativo não confirmado pelo servidor. Recarregue a sessão.",
      });
      return null;
    }

    persistUser(result.data);
    return result.data;
  }

  return {
    activeMode,
    authenticated,
    authLoading,
    authStatus,
    booting,
    clearSession,
    handleUnauthorized,
    login,
    register,
    reloadCurrentUser,
    syncUserFromServer,
    token,
    user,
  };
}
