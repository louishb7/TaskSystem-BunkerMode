import React from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"

import BootScreen from "../components/tactical/BootScreen"
import AppShell from "../components/layout/AppShell"
import ExecutionLayout from "../components/layout/ExecutionLayout"
import { emptyStatus } from "../constants/uiState"
import { useAuth } from "../context/AuthContext"
import { useTaskBoardContext } from "../context/TaskBoardContext"
import AuthScreen from "../features/auth/components/AuthScreen"
import ObjectivesPage from "../features/objectives/pages/ObjectivesPage"
import FocusPage from "../features/tasks/pages/FocusPage"
import TasksPage from "../features/tasks/pages/TasksPage"
import { APP_ROUTES } from "../routes/routeConstants"

export default function App() {
  const auth = useAuth()

  if (auth.booting) {
    return <BootScreen />
  }

  return (
    <Routes>
      <Route path={APP_ROUTES.AUTH} element={<AuthRoute />} />
      <Route path={APP_ROUTES.ROOT} element={<Navigate to={APP_ROUTES.TASKS} replace />} />
      <Route
        path={APP_ROUTES.LEGACY_FOCUS}
        element={<Navigate to={APP_ROUTES.TASKS_FOCUS} replace />}
      />
      <Route
        path={APP_ROUTES.TASKS_FOCUS}
        element={
          <ProtectedRoute>
            <FocusRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path={APP_ROUTES.TASKS}
        element={
          <ProtectedRoute>
            <TasksRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path={APP_ROUTES.OBJECTIVES}
        element={
          <ProtectedRoute>
            <ObjectivesRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={<Navigate to={auth.authenticated ? APP_ROUTES.TASKS : APP_ROUTES.AUTH} replace />}
      />
    </Routes>
  )
}

function AuthRoute() {
  const auth = useAuth()

  if (auth.authenticated) {
    return <Navigate to={APP_ROUTES.TASKS} replace />
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

function ProtectedRoute({ children }) {
  const auth = useAuth()

  if (!auth.authenticated) {
    return <Navigate to={APP_ROUTES.AUTH} replace />
  }

  return children
}

function TasksRoute() {
  const navigate = useNavigate()
  const auth = useAuth()
  const board = useTaskBoardContext()
  const logout = useLogout()

  function startFocus() {
    board.setStatus(emptyStatus)
    navigate(APP_ROUTES.TASKS_FOCUS, { replace: true })
    return true
  }

  return (
    <AppShell onLogout={logout} user={auth.user}>
      <TasksPage
        board={board}
        onStartFocus={startFocus}
        onUnauthorized={auth.handleUnauthorized}
        token={auth.token}
        user={auth.user}
      />
    </AppShell>
  )
}

function ObjectivesRoute() {
  const auth = useAuth()
  const board = useTaskBoardContext()
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

function FocusRoute() {
  const navigate = useNavigate()
  const auth = useAuth()
  const board = useTaskBoardContext()

  function returnToTasks() {
    board.setStatus(emptyStatus)
    navigate(APP_ROUTES.TASKS, { replace: true })
    return true
  }

  return (
    <ExecutionLayout onReturnToTasks={returnToTasks}>
      <FocusPage
        actionTasks={board.actionTasks}
        board={board}
        dailyTasks={board.dailyTasks}
        timezone={auth.user?.timezone}
      />
    </ExecutionLayout>
  )
}

function useLogout() {
  const navigate = useNavigate()
  const auth = useAuth()
  const board = useTaskBoardContext()

  return () => {
    auth.clearSession()
    board.setStatus(emptyStatus)
    board.setFormStatus(emptyStatus)
    navigate(APP_ROUTES.AUTH, { replace: true })
  }
}
