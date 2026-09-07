import React from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"

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
          <Navigate to={auth.authenticated ? APP_ROUTES.GENERAL_HOME : APP_ROUTES.AUTH} replace />
        }
      />
    </Routes>
  )
}

function AuthRoute() {
  const auth = useAuth()

  if (auth.authenticated) {
    return <Navigate to={APP_ROUTES.GENERAL_HOME} replace />
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

  function activateSoldierMode() {
    board.setStatus(emptyStatus)
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

  function returnToCommand() {
    board.setStatus(emptyStatus)
    navigate(APP_ROUTES.GENERAL_HOME, { replace: true })
    return true
  }

  return (
    <ExecutionLayout onReturnToGeneral={returnToCommand}>
      <SoldierExecutionPage
        actionMissions={board.actionMissions}
        board={board}
        dailyMissions={board.dailyMissions}
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
