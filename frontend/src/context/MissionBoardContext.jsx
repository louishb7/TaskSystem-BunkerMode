import React, { createContext, useContext } from "react"

import { useMissionBoard } from "../features/missions/hooks/useMissionBoard.js"
import { useAuth } from "./AuthContext.jsx"

const MissionBoardContext = createContext(null)

export function MissionBoardProvider({ children }) {
  const auth = useAuth()
  const board = useMissionBoard({
    activeMode: auth.activeMode,
    authenticated: auth.authenticated,
    onUnauthorized: auth.handleUnauthorized,
    token: auth.token,
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
