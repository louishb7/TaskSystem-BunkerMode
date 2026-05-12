import React, { useState } from "react";

import { getErrorMessage } from "../api/httpClient.js";
import BootScreen from "../components/tactical/BootScreen.jsx";
import { emptyStatus } from "../constants/uiState.js";
import AuthScreen from "../features/auth/components/AuthScreen.jsx";
import { useAuthSession } from "../features/auth/hooks/useAuthSession.js";
import GeneralCommandPage from "../features/general/pages/GeneralCommandPage.jsx";
import { useMissionBoard } from "../features/missions/hooks/useMissionBoard.js";
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
        message: getErrorMessage(result, "Não foi possível ativar o Soldado."),
      });
      return false;
    }

    await auth.reloadCurrentUser();
    setActiveRoute(APP_ROUTES.GENERAL_HOME);
    return true;
  }

  async function returnToCommand(password) {
    board.setStatus(emptyStatus);
    const result = await api.unlockGeneral(auth.token, { senha: password });

    if (auth.handleUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      board.setStatus({
        type: "error",
        message: getErrorMessage(result, "General negado."),
      });
      return false;
    }

    await auth.reloadCurrentUser();
    setActiveRoute(board.hasRegisteredOutcomes ? APP_ROUTES.REVIEW : APP_ROUTES.GENERAL_HOME);
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
        onReview={board.submitGeneralReview}
        status={board.status}
      />
    );
  }

  return (
    <GeneralCommandPage
      board={board}
      generalName={generalName}
      onActivateSoldier={activateSoldierMode}
      onLogout={clearSession}
      onOpenReview={() => setActiveRoute(APP_ROUTES.REVIEW)}
      user={auth.user}
    />
  );
}
