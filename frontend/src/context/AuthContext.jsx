import React, { createContext, useContext } from "react"

import { useAuthSession } from "../features/auth/hooks/useAuthSession.js"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const auth = useAuthSession()

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.")
  }
  return auth
}
