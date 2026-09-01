import React, { createContext, useContext } from "react"
import { useLocation } from "react-router-dom"

import { useMissionBoard } from "../features/missions/hooks/useMissionBoard"
import { APP_ROUTES } from "../routes/routeConstants"
import { useAuth } from "./AuthContext"

const MissionBoardContext = createContext(null)

export function MissionBoardProvider({ children }) {
  const auth = useAuth()
  const location = useLocation()
  const viewMode = location.pathname === APP_ROUTES.SOLDIER ? "soldier" : "general"
  const board = useMissionBoard({
    authenticated: auth.authenticated,
    onUnauthorized: auth.handleUnauthorized,
    token: auth.token,
    viewMode,
  })

  return <MissionBoardContext.Provider value={board}>{children}</MissionBoardContext.Provider>
}

export function useMissionBoardContext() {
  const board = useContext(MissionBoardContext)
  if (!board) {
    throw new Error("useMissionBoardContext deve ser usado dentro de MissionBoardProvider.")
  }
  return board
}
