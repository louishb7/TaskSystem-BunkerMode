import React from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"

import { getErrorMessage } from "../api/httpClient"
import BootScreen from "../components/tactical/BootScreen"
import AppShell from "../components/layout/AppShell"
import ExecutionLayout from "../components/layout/ExecutionLayout"
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
  const logout = useLogout()

  async function activateSoldierMode() {
    board.setStatus(emptyStatus)
    const result = await api.setSessionMode(auth.token, { mode: "soldier" })

    if (auth.handleUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      board.setStatus({
        type: "error",
        message: `${getErrorMessage(result, "Não foi possível salvar a preferência de modo.")} O foco operacional será aberto mesmo assim.`,
      })
      navigate(APP_ROUTES.SOLDIER, { replace: true })
      return true
    }

    auth.syncUserFromServer(result.data)
    const confirmedUser = await auth.reloadCurrentUser()
    if (!confirmedUser) {
      board.setStatus({
        type: "error",
        message: "Foco operacional aberto, mas não foi possível atualizar a preferência de modo.",
      })
    }

    navigate(APP_ROUTES.SOLDIER, { replace: true })
    return true
  }

  return (
    <AppShell onLogout={logout} user={auth.user}>
      <GeneralCommandPage
        board={board}
        onActivateSoldier={activateSoldierMode}
        onUnauthorized={auth.handleUnauthorized}
        token={auth.token}
        user={auth.user}
      />
    </AppShell>
  )
}

function ObjectivesRoute() {
  const auth = useAuth()
  const board = useMissionBoardContext()
  const logout = useLogout()

  return (
    <AppShell onLogout={logout} user={auth.user}>
      <ObjectivesPage
        board={board}
        onUnauthorized={auth.handleUnauthorized}
        token={auth.token}
        user={auth.user}
      />
    </AppShell>
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
        message: `${getErrorMessage(result, "Não foi possível salvar a preferência de modo.")} O retorno ao General será feito mesmo assim.`,
      })
      navigate(APP_ROUTES.GENERAL_HOME, { replace: true })
      return true
    }

    auth.syncUserFromServer(result.data)
    const confirmedUser = await auth.reloadCurrentUser()
    if (!confirmedUser) {
      board.setStatus({
        type: "error",
        message: "Você retornou ao General, mas não foi possível atualizar a preferência de modo.",
      })
    }

    navigate(APP_ROUTES.GENERAL_HOME, { replace: true })
    return true
  }

  return (
    <ExecutionLayout onReturnToGeneral={returnToCommand}>
      <SoldierExecutionPage
        actionMissions={board.actionMissions}
        board={board}
        dailyMissions={board.dailyMissions}
        missions={board.missions}
        timezone={auth.user?.timezone}
      />
    </ExecutionLayout>
  )
}

function useLogout() {
  const navigate = useNavigate()
  const auth = useAuth()
  const board = useMissionBoardContext()

  return () => {
    auth.clearSession()
    board.setStatus(emptyStatus)
    board.setFormStatus(emptyStatus)
    navigate(APP_ROUTES.AUTH, { replace: true })
  }
}
