import React from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"

import { getErrorMessage } from "../api/httpClient.js"
import BootScreen from "../components/tactical/BootScreen.jsx"
import { emptyStatus } from "../constants/uiState.js"
import { useAuth } from "../context/AuthContext.jsx"
import { useMissionBoardContext } from "../context/MissionBoardContext.jsx"
import AuthScreen from "../features/auth/components/AuthScreen.jsx"
import GeneralCommandPage from "../features/general/pages/GeneralCommandPage.jsx"
import MountainPage from "../features/mountain/pages/MountainPage.jsx"
import ReviewPage from "../features/review/pages/ReviewPage.jsx"
import SoldierExecutionPage from "../features/soldier/pages/SoldierExecutionPage.jsx"
import { APP_ROUTES } from "../routes/routeConstants.js"
import { api } from "../services/bunkermodeApi.js"

export default function App() {
  const auth = useAuth()

  if (auth.booting) {
    return <BootScreen />
  }

  return (
    <Routes>
      <Route path={APP_ROUTES.AUTH} element={<AuthRoute />} />
      <Route path={APP_ROUTES.SOLDIER} element={<ProtectedRoute routeMode="soldier" />} />
      <Route path={APP_ROUTES.REVIEW} element={<ProtectedRoute routeMode="review" />} />
      <Route path={APP_ROUTES.MOUNTAIN} element={<ProtectedRoute routeMode="mountain" />} />
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
    return (
      <Navigate
        to={auth.activeMode === "soldier" ? APP_ROUTES.SOLDIER : APP_ROUTES.GENERAL_HOME}
        replace
      />
    )
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

  if (auth.activeMode === "soldier") {
    return routeMode === "soldier" ? <SoldierRoute /> : <Navigate to={APP_ROUTES.SOLDIER} replace />
  }

  if (routeMode === "soldier") {
    return <Navigate to={APP_ROUTES.GENERAL_HOME} replace />
  }

  if (routeMode === "review") {
    return <ReviewRoute />
  }

  if (routeMode === "mountain") {
    return <MountainRoute />
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
      onOpenMountain={() => navigate(APP_ROUTES.MOUNTAIN)}
      onOpenReview={() => navigate(APP_ROUTES.REVIEW)}
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

function ReviewRoute() {
  const navigate = useNavigate()
  const board = useMissionBoardContext()

  return (
    <ReviewPage
      allMissions={board.dailyMissions}
      loadingMissionId={board.reviewLoadingId}
      missions={board.reviewMissions}
      onBack={() => navigate(APP_ROUTES.GENERAL_HOME)}
      onClearFailures={board.clearFailureReport}
      onCloseReview={board.closeWeeklyReview}
      onReview={board.submitGeneralReview}
      reviewState={board.reviewState}
      status={board.status}
      weeklyReviews={board.weeklyReviews}
    />
  )
}

function MountainRoute() {
  const navigate = useNavigate()
  const auth = useAuth()
  const board = useMissionBoardContext()

  return (
    <MountainPage
      onClose={async () => {
        navigate(APP_ROUTES.GENERAL_HOME)
        await board.refreshGeneralBoard()
      }}
      onUnauthorized={auth.handleUnauthorized}
      token={auth.token}
    />
  )
}
