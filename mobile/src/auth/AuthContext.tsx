import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setUnauthorizedHandler } from "@/api/client";
import * as authApi from "@/api/auth";
import { clearStoredToken, getStoredToken, storeToken } from "./authStorage";
import type { LoginPayload, User } from "@/types/auth";

type Status = {
  message: string;
  type: "error" | "success" | "";
};

type AuthContextValue = {
  authenticated: boolean;
  booting: boolean;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => Promise<void>;
  status: Status;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const emptyStatus: Status = { message: "", type: "" };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(emptyStatus);

  const logout = useCallback(async () => {
    await clearStoredToken();
    setUser(null);
    setStatus(emptyStatus);
  }, []);

  const handleUnauthorized = useCallback(async () => {
    await clearStoredToken();
    setUser(null);
    setStatus({ type: "error", message: "Sessão expirada. Faça login novamente." });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, [handleUnauthorized]);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      setBooting(true);
      const token = await getStoredToken();
      if (!token) {
        if (active) {
          setBooting(false);
        }
        return;
      }

      const result = await authApi.getCurrentUser();
      if (!active) {
        return;
      }

      if (result.ok) {
        setUser(result.data);
        setStatus(emptyStatus);
      } else {
        await clearStoredToken();
        setUser(null);
        setStatus({ type: "error", message: result.message || "Sessão não confirmada." });
      }
      setBooting(false);
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    if (!payload.email.trim() || !payload.senha) {
      setStatus({ type: "error", message: "Preencha e-mail ou usuário e senha." });
      return false;
    }

    setLoading(true);
    setStatus(emptyStatus);
    const result = await authApi.login({ email: payload.email.trim(), senha: payload.senha });
    setLoading(false);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message || "Não foi possível entrar no bunker." });
      return false;
    }

    await storeToken(result.data.access_token);
    setUser(result.data.usuario);
    return true;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authenticated: Boolean(user),
      booting,
      loading,
      login,
      logout,
      status,
      user,
    }),
    [booting, loading, login, logout, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
