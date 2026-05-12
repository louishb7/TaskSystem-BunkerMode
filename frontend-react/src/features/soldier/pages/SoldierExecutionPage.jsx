import React, { useState } from "react";

import EmptyState from "../../../components/ui/EmptyState.jsx";
import LionEmblem from "../../../components/ui/LionEmblem.jsx";
import StatusNotice from "../../../components/ui/StatusNotice.jsx";
import TacticalShell from "../../../components/tactical/TacticalShell.jsx";
import { formatCurrentDay } from "../../calendar/calendarUtils.js";
import MissionCard, { MissionProgress } from "../../missions/components/MissionCard.jsx";
import ReturnToCommandDialog from "../components/ReturnToCommandDialog.jsx";

export default function SoldierExecutionPage({
  actionMissions,
  board,
  dailyMissions,
  missions,
  onReturnToCommand,
}) {
  const [returnStep, setReturnStep] = useState("closed");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);
  const remainingOrders = actionMissions.length;

  async function submitReturn(event) {
    event.preventDefault();

    if (!unlockPassword.trim()) {
      board.setStatus({ type: "error", message: "Informe a senha para retornar ao comando." });
      return;
    }

    setReturnLoading(true);
    const returned = await onReturnToCommand(unlockPassword);
    setReturnLoading(false);

    if (returned) {
      setUnlockPassword("");
      setReturnStep("closed");
    }
  }

  function closeReturnDialog() {
    setUnlockPassword("");
    setReturnStep("closed");
  }

  return (
    <TacticalShell mode="soldier">
      <section className="soldier-layout">
        <header className="soldier-header">
          <div className="soldier-topline">
            <span>MODO SOLDADO</span>
            <span>{remainingOrders} RESTAM</span>
          </div>
          <div className="soldier-briefing">
            <LionEmblem compact />
            <div>
              <h1>LEÃO DO DIA</h1>
              <p>{formatCurrentDay()}</p>
              <div className="soldier-rule" />
              <strong>
                {remainingOrders === 0
                  ? "Caçada concluída. Aguarde o retorno ao comando."
                  : remainingOrders === 1
                    ? "1 ordem restante para matar o leão. Execute."
                    : `${remainingOrders} ordens restantes para matar o leão. Execute.`}
              </strong>
            </div>
          </div>
        </header>

        <section className="panel soldier-progress-panel" aria-label="Progresso da caçada do dia">
          <MissionProgress label="CAÇADA" missions={dailyMissions.length > 0 ? dailyMissions : missions} />
        </section>

        <StatusNotice status={board.status} />

        {board.missionLoading ? (
          <EmptyState
            title="Sincronizando ordens"
            message="O Soldado aguarda o quadro operacional."
          />
        ) : actionMissions.length > 0 ? (
          <div className="mission-list soldier-list">
            {actionMissions.map((mission) => (
              <MissionCard
                key={mission.id}
                completing={board.completeLoadingId === mission.id}
                justifying={board.justificationLoadingId === mission.id}
                mission={mission}
                onComplete={() => board.completeMission(mission)}
                onJustify={board.submitFailureJustification}
                variant="soldier"
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Caçada concluída"
            message="Nenhuma ordem resta para execução agora."
          />
        )}

        <footer className="soldier-footer">
          <button
            className="mode-switch return-command"
            type="button"
            onClick={() => setReturnStep("confirm")}
            disabled={returnLoading}
          >
            <span>RETORNAR AO COMANDO</span>
            <strong>VALIDAR</strong>
          </button>
        </footer>
      </section>

      {returnStep !== "closed" && (
        <ReturnToCommandDialog
          loading={returnLoading}
          onCancel={closeReturnDialog}
          onContinue={() => setReturnStep("password")}
          onPasswordChange={setUnlockPassword}
          onSubmit={submitReturn}
          password={unlockPassword}
          step={returnStep}
        />
      )}
    </TacticalShell>
  );
}
