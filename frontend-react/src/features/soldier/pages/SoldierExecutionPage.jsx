import React, { useState } from "react";

import EmptyState from "../../../components/ui/EmptyState.jsx";
import LionEmblem from "../../../components/ui/LionEmblem.jsx";
import StatusNotice from "../../../components/ui/StatusNotice.jsx";
import TacticalShell from "../../../components/tactical/TacticalShell.jsx";
import { formatCurrentDay } from "../../calendar/calendarUtils.js";
import MissionCard, { MissionProgress } from "../../missions/components/MissionCard.jsx";
import ReturnToCommandDialog from "../components/ReturnToCommandDialog.jsx";

function formatOperationalTurnDate(value) {
  if (!value || typeof value !== "string") {
    return formatCurrentDay();
  }
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) {
    return formatCurrentDay();
  }
  try {
    return new Date(year, month - 1, day)
      .toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      })
      .toUpperCase();
  } catch {
    return formatCurrentDay();
  }
}

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
  const turn = board.operationalTurn;
  const showTurnWarning = turn?.requires_decision === true && !board.operationalTurnAcknowledged;
  const turnDateLabel = formatOperationalTurnDate(turn?.active_date_label);

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
            <span>EXECUÇÃO</span>
          </div>
          <div className="soldier-briefing">
            <LionEmblem compact />
            <div>
              <h1>LEÃO DO DIA</h1>
              <p>{turnDateLabel}</p>
              <div className="soldier-rule" />
              <p className="soldier-lock-note">Planejamento bloqueado. Somente execução permanece disponível.</p>
              <strong>
                {remainingOrders === 0
                  ? "Caçada concluída. Aguarde o retorno ao comando."
                  : "Ordens em execução."}
              </strong>
            </div>
          </div>
        </header>

        <section className="panel soldier-progress-panel" aria-label="Progresso da caçada do dia">
          <MissionProgress label="CAÇADA" missions={dailyMissions.length > 0 ? dailyMissions : missions} />
        </section>

        <StatusNotice status={board.status} />

        {showTurnWarning && (
          <section className="operational-turn-panel" aria-label="Transição operacional de turno">
            <div>
              <span>TRANSIÇÃO DE TURNO</span>
              <strong>Existem ordens pendentes do ciclo anterior.</strong>
              <p>
                O novo dia já tem ordens prontas. Continue o ciclo anterior ou encerre as pendências como falha para abrir a nova caçada.
              </p>
            </div>
            <div className="operational-turn-actions">
              <button
                className="button secondary compact"
                disabled={board.missionLoading}
                type="button"
                onClick={board.continuePreviousOperationalTurn}
              >
                CONTINUAR CICLO ANTERIOR
              </button>
              <button
                className="button fire compact"
                disabled={board.missionLoading}
                type="button"
                onClick={board.closePreviousOperationalTurn}
              >
                ENCERRAR PENDÊNCIAS
              </button>
            </div>
          </section>
        )}

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
            message="Nenhuma ordem disponível para execução agora."
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
