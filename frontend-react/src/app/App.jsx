import React, { useState } from "react";

import { getErrorMessage } from "../api/httpClient.js";
import BootScreen from "../components/tactical/BootScreen.jsx";
import { emptyStatus } from "../constants/uiState.js";
import AuthScreen from "../features/auth/components/AuthScreen.jsx";
import { useAuthSession } from "../features/auth/hooks/useAuthSession.js";
import GeneralCommandPage from "../features/general/pages/GeneralCommandPage.jsx";
import { useMissionBoard } from "../features/missions/hooks/useMissionBoard.js";
import MountainPage from "../features/mountain/pages/MountainPage.jsx";
import ReviewPage from "../features/review/pages/ReviewPage.jsx";
import SoldierExecutionPage from "../features/soldier/pages/SoldierExecutionPage.jsx";
import { APP_ROUTES } from "../routes/routeConstants.js";
import { api } from "../services/bunkermodeApi.js";

export default function App() {
  const [activeRoute, setActiveRoute] = useState(APP_ROUTES.GENERAL_HOME);
  const auth = useAuthSession();
  const board = useMissionBoard({
    activeMode: auth.activeMode,
    authenticated: auth.authenticated,
    onUnauthorized: auth.handleUnauthorized,
    token: auth.token,
  });

  const soldierMode = auth.activeMode === "soldier";
  const generalName = auth.user?.nome_general || auth.user?.usuario || "General";

  function clearSession() {
    auth.clearSession();
    board.setStatus(emptyStatus);
    board.setFormStatus(emptyStatus);
    setActiveRoute(APP_ROUTES.GENERAL_HOME);
  }

  async function activateSoldierMode() {
    board.setStatus(emptyStatus);
    const result = await api.setSessionMode(auth.token, { mode: "soldier" });

    if (auth.handleUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      board.setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível entrar em foco operacional."),
      });
      return false;
    }

    auth.syncUserFromServer(result.data);
    const confirmedUser = await auth.reloadCurrentUser("soldier");
    if (!confirmedUser) {
      board.setStatus({
        type: "error",
        message: "Foco operacional aberto, mas a sessão não confirmou o modo ativo.",
      });
      return false;
    }

    setActiveRoute(APP_ROUTES.GENERAL_HOME);
    return true;
  }

  async function returnToCommand() {
    board.setStatus(emptyStatus);
    const result = await api.setSessionMode(auth.token, { mode: "general" });

    if (auth.handleUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      board.setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível retornar ao comando."),
      });
      return false;
    }

    auth.syncUserFromServer(result.data);
    const confirmedUser = await auth.reloadCurrentUser("general");
    if (!confirmedUser) {
      board.setStatus({
        type: "error",
        message: "Retorno ao General não foi confirmado pela sessão.",
      });
      return false;
    }

    setActiveRoute(APP_ROUTES.GENERAL_HOME);
    return true;
  }

  if (auth.booting) {
    return <BootScreen />;
  }

  if (!auth.authenticated) {
    return (
      <AuthScreen
        loading={auth.authLoading}
        onLogin={auth.login}
        onRegister={auth.register}
        status={auth.authStatus}
      />
    );
  }

  if (soldierMode) {
    return (
      <SoldierExecutionPage
        actionMissions={board.actionMissions}
        board={board}
        dailyMissions={board.dailyMissions}
        missions={board.missions}
        onReturnToCommand={returnToCommand}
      />
    );
  }

  if (activeRoute === APP_ROUTES.REVIEW) {
    return (
      <ReviewPage
        allMissions={board.dailyMissions}
        loadingMissionId={board.reviewLoadingId}
        missions={board.reviewMissions}
        onBack={() => setActiveRoute(APP_ROUTES.GENERAL_HOME)}
        onClearFailures={board.clearFailureReport}
        onCloseReview={board.closeWeeklyReview}
        onReview={board.submitGeneralReview}
        reviewState={board.reviewState}
        status={board.status}
        weeklyReviews={board.weeklyReviews}
      />
    );
  }

  if (activeRoute === APP_ROUTES.MOUNTAIN) {
    return (
      <TacticalMountainRoute
        onBack={async () => {
          setActiveRoute(APP_ROUTES.GENERAL_HOME);
          await board.refreshGeneralBoard();
        }}
        onUnauthorized={auth.handleUnauthorized}
        token={auth.token}
      />
    );
  }

  return (
    <GeneralCommandPage
      board={board}
      generalName={generalName}
      onActivateSoldier={activateSoldierMode}
      onLogout={clearSession}
      onOpenMountain={() => setActiveRoute(APP_ROUTES.MOUNTAIN)}
      onOpenReview={() => setActiveRoute(APP_ROUTES.REVIEW)}
      onUnauthorized={auth.handleUnauthorized}
      token={auth.token}
      user={auth.user}
    />
  );
}

function TacticalMountainRoute({ onBack, onUnauthorized, token }) {
  return (
    <MountainPage
      onClose={onBack}
      onUnauthorized={onUnauthorized}
      token={token}
    />
  );
}
