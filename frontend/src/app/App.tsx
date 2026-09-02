import React from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"

import { getErrorMessage } from "../api/httpClient"
import BootScreen from "../components/tactical/BootScreen"
import { emptyStatus } from "../constants/uiState"
import { useAuth } from "../context/AuthContext"
import { useMissionBoardContext } from "../context/MissionBoardContext"
import AuthScreen from "../features/auth/components/AuthScreen"
import GeneralCommandPage from "../features/general/pages/GeneralCommandPage"
import ObjectivesPage from "../features/objectives/pages/ObjectivesPage"
import SoldierExecutionPage from "../features/soldier/pages/SoldierExecutionPage"
import { APP_ROUTES } from "../routes/routeConstants"
import { api } from "../services/bunkermodeApi"

function preferredLanding(activeMode) {
  return activeMode === "soldier" ? APP_ROUTES.SOLDIER : APP_ROUTES.GENERAL_HOME
}

export default function App() {
  const auth = useAuth()

  if (auth.booting) {
    return <BootScreen />
  }

  return (
    <Routes>
      <Route path={APP_ROUTES.AUTH} element={<AuthRoute />} />
      <Route path={APP_ROUTES.SOLDIER} element={<ProtectedRoute routeMode="soldier" />} />
      <Route path={APP_ROUTES.OBJECTIVES} element={<ProtectedRoute routeMode="objectives" />} />
      <Route path={APP_ROUTES.GENERAL_HOME} element={<ProtectedRoute routeMode="general" />} />
      <Route
        path="*"
        element={
          <Navigate
            to={auth.authenticated ? preferredLanding(auth.activeMode) : APP_ROUTES.AUTH}
            replace
          />
        }
      />
    </Routes>
  )
}

function AuthRoute() {
  const auth = useAuth()

  if (auth.authenticated) {
    return <Navigate to={preferredLanding(auth.activeMode)} replace />
  }

  return (
    <AuthScreen
      loading={auth.authLoading}
      onLogin={auth.login}
      onRegister={auth.register}
      status={auth.authStatus}
    />
  )
}

function ProtectedRoute({ routeMode }) {
  const auth = useAuth()

  if (!auth.authenticated) {
    return <Navigate to={APP_ROUTES.AUTH} replace />
  }

  if (routeMode === "soldier") {
    return <SoldierRoute />
  }

  if (routeMode === "objectives") {
    return <ObjectivesRoute />
  }

  return <GeneralRoute />
}

function GeneralRoute() {
  const navigate = useNavigate()
  const auth = useAuth()
  const board = useMissionBoardContext()
  const generalName = auth.user?.nome_general || auth.user?.usuario || "General"

  function clearSession() {
    auth.clearSession()
    board.setStatus(emptyStatus)
    board.setFormStatus(emptyStatus)
    navigate(APP_ROUTES.AUTH, { replace: true })
  }

  async function activateSoldierMode() {
    board.setStatus(emptyStatus)
    const result = await api.setSessionMode(auth.token, { mode: "soldier" })

    if (auth.handleUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      board.setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível entrar em foco operacional."),
      })
      return false
    }

    auth.syncUserFromServer(result.data)
    const confirmedUser = await auth.reloadCurrentUser("soldier")
    if (!confirmedUser) {
      board.setStatus({
        type: "error",
        message: "Foco operacional aberto, mas a sessão não confirmou o modo ativo.",
      })
      return false
    }

    navigate(APP_ROUTES.SOLDIER, { replace: true })
    return true
  }

  return (
    <GeneralCommandPage
      board={board}
      generalName={generalName}
      onActivateSoldier={activateSoldierMode}
      onLogout={clearSession}
      onOpenObjectives={() => navigate(APP_ROUTES.OBJECTIVES)}
      onUnauthorized={auth.handleUnauthorized}
      token={auth.token}
      user={auth.user}
    />
  )
}

function ObjectivesRoute() {
  const navigate = useNavigate()
  const auth = useAuth()
  const board = useMissionBoardContext()

  return (
    <ObjectivesPage
      board={board}
      onBack={() => navigate(APP_ROUTES.GENERAL_HOME)}
      onUnauthorized={auth.handleUnauthorized}
      token={auth.token}
      user={auth.user}
    />
  )
}

function SoldierRoute() {
  const navigate = useNavigate()
  const auth = useAuth()
  const board = useMissionBoardContext()

  async function returnToCommand() {
    board.setStatus(emptyStatus)
    const result = await api.setSessionMode(auth.token, { mode: "general" })

    if (auth.handleUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      board.setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível retornar ao comando."),
      })
      return false
    }

    auth.syncUserFromServer(result.data)
    const confirmedUser = await auth.reloadCurrentUser("general")
    if (!confirmedUser) {
      board.setStatus({
        type: "error",
        message: "Retorno ao General não foi confirmado pela sessão.",
      })
      return false
    }

    navigate(APP_ROUTES.GENERAL_HOME, { replace: true })
    return true
  }

  return (
    <SoldierExecutionPage
      actionMissions={board.actionMissions}
      board={board}
      dailyMissions={board.dailyMissions}
      missions={board.missions}
      onReturnToCommand={returnToCommand}
    />
  )
}
