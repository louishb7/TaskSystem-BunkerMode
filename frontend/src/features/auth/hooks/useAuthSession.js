import { useCallback, useEffect, useState } from "react"

import { getErrorMessage } from "../../../api/httpClient.js"
import { TOKEN_KEY, USER_KEY } from "../../../constants/session.js"
import { emptyStatus } from "../../../constants/uiState.js"
import { api } from "../../../services/bunkermodeApi.js"

const sessionStore = window.sessionStorage

function readStoredUser() {
  const rawUser = sessionStore.getItem(USER_KEY)
  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser)
  } catch {
    sessionStore.removeItem(TOKEN_KEY)
    sessionStore.removeItem(USER_KEY)
    return null
  }
}

export function useAuthSession() {
  const [token, setToken] = useState(() => sessionStore.getItem(TOKEN_KEY))
  const [user, setUser] = useState(readStoredUser)
  const [booting, setBooting] = useState(false)
  const [authStatus, setAuthStatus] = useState(emptyStatus)
  const [authLoading, setAuthLoading] = useState(false)

  const authenticated = Boolean(token && user)
  const activeMode = user?.active_mode || "general"

  const persistUser = useCallback((nextUser) => {
    sessionStore.setItem(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }, [])

  const clearSession = useCallback(() => {
    sessionStore.removeItem(TOKEN_KEY)
    sessionStore.removeItem(USER_KEY)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
    setAuthStatus(emptyStatus)
    setBooting(false)
  }, [])

  const handleUnauthorized = useCallback(
    (result) => {
      if (result?.status === 401) {
        clearSession()
        setAuthStatus({ type: "error", message: "Sessão expirada. Faça login novamente." })
        return true
      }
      return false
    },
    [clearSession]
  )

  const restoreSession = useCallback(async () => {
    setBooting(true)
    const result = await api.getCurrentUser(token)
    setBooting(false)

    if (handleUnauthorized(result)) {
      return
    }

    if (!result.ok) {
      clearSession()
      setAuthStatus({
        type: "error",
        message: getErrorMessage(result, "Sessão não confirmada. Entre novamente."),
      })
      return
    }

    persistUser(result.data)
  }, [clearSession, handleUnauthorized, persistUser, token])

  useEffect(() => {
    if (!token) {
      setBooting(false)
      return
    }

    if (user) {
      setBooting(false)
      return
    }

    restoreSession()
  }, [restoreSession, token, user])

  async function login(payload) {
    if (!payload.email || !payload.senha) {
      setAuthStatus({ type: "error", message: "Preencha e-mail ou usuário e senha." })
      return
    }

    setAuthLoading(true)
    setAuthStatus(emptyStatus)
    const result = await api.login(payload)
    setAuthLoading(false)

    if (!result.ok) {
      setAuthStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível entrar no bunker."),
      })
      return
    }

    sessionStore.setItem(TOKEN_KEY, result.data.access_token)
    setToken(result.data.access_token)
    persistUser(result.data.usuario)
  }

  async function register(payload) {
    if (!payload.usuario || !payload.email || !payload.senha) {
      setAuthStatus({ type: "error", message: "Preencha usuário, e-mail e senha." })
      return
    }

    setAuthLoading(true)
    setAuthStatus(emptyStatus)
    const result = await api.register(payload)
    setAuthLoading(false)

    if (!result.ok) {
      setAuthStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível criar a conta."),
      })
      return
    }

    setAuthStatus({ type: "success", message: "Conta criada. Entre no bunker para continuar." })
  }

  function syncUserFromServer(nextUser) {
    persistUser(nextUser)
  }

  async function reloadCurrentUser(expectedMode = null) {
    const result = await api.getCurrentUser(token)

    if (handleUnauthorized(result)) {
      return null
    }

    if (!result.ok) {
      setAuthStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível recarregar o usuário."),
      })
      return null
    }

    if (expectedMode && result.data?.active_mode !== expectedMode) {
      setAuthStatus({
        type: "error",
        message: "Modo ativo não confirmado pelo servidor. Recarregue a sessão.",
      })
      return null
    }

    persistUser(result.data)
    return result.data
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
  }
}
