import React, { useState } from "react";

import EmptyState from "../../../components/ui/EmptyState.jsx";
import LionEmblem from "../../../components/ui/LionEmblem.jsx";
import StatusNotice from "../../../components/ui/StatusNotice.jsx";
import TacticalShell from "../../../components/tactical/TacticalShell.jsx";
import { isCompleted } from "../../../utils/missionStatus.js";
import { formatCurrentDay } from "../../calendar/calendarUtils.js";
import MissionCard, { MissionProgress } from "../../missions/components/MissionCard.jsx";

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
  const [returnLoading, setReturnLoading] = useState(false);
  const turn = board.operationalTurn;
  const showTurnWarning = turn?.requires_decision === true && !board.operationalTurnAcknowledged;
  const turnDateLabel = formatOperationalTurnDate(turn?.active_date_label);
  const hasCompletedMissions = dailyMissions.some(isCompleted);

  async function handleReturnToCommand() {
    setReturnLoading(true);
    await onReturnToCommand();
    setReturnLoading(false);
  }

  function renderTurnWarning() {
    if (!showTurnWarning) {
      return null;
    }

    return (
      <section className="operational-turn-panel" aria-label="Transição operacional de turno">
        <div>
          <span>TRANSIÇÃO DE TURNO</span>
          <strong>Existem ordens pendentes do ciclo anterior.</strong>
          <p>
            O novo dia já tem ordens prontas. Continue o ciclo anterior ou encerre as pendências como falha para abrir a nova operação.
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
    );
  }

  return (
    <TacticalShell mode="soldier">
      <section className="soldier-layout">
        <header className="soldier-header">
          <div className="soldier-topline">
            <span>FOCO OPERACIONAL</span>
          </div>
          <div className="soldier-briefing">
            <LionEmblem variant="hero" />
            <div className="soldier-briefing-copy">
              <h1>LEÃO DO DIA</h1>
              <div className="soldier-briefing-meta">
                <span>{turnDateLabel}</span>
              </div>
              <MissionProgress label="CAÇADA" missions={dailyMissions.length > 0 ? dailyMissions : missions} />
            </div>
          </div>
        </header>

        <StatusNotice status={board.status} />

        {board.missionLoading && (
          <EmptyState
            title="Sincronizando ordens"
            message="O foco operacional está sincronizando o quadro."
          />
        )}

        {!board.missionLoading && actionMissions.length > 0 && (
          <div className="mission-list soldier-list">
            {renderTurnWarning()}
            {actionMissions.map((mission) => (
              <MissionCard
                key={mission.id}
                completing={board.completeLoadingId === mission.id}
                justifying={board.justificationLoadingId === mission.id}
                mission={mission}
                onComplete={() => board.completeMission(mission)}
                onJustify={board.submitFailureJustification}
                onTogglePin={() => board.toggleMissionPin(mission)}
                pinning={board.pinLoadingId === mission.id}
                variant="soldier"
              />
            ))}
          </div>
        )}

        {!board.missionLoading && actionMissions.length === 0 && (
          <>
            {renderTurnWarning()}
            {dailyMissions.length === 0 ? (
              <EmptyState
                title="Nenhuma ordem para hoje"
                message="O General não definiu missões para este dia."
              />
            ) : hasCompletedMissions ? (
              <EmptyState
                title="Caçada concluída"
                message="Todos os leões do dia foram abatidos."
              />
            ) : (
              <EmptyState
                title="Sem ordens em aberto"
                message="As missões do dia foram registradas como falha."
              />
            )}
          </>
        )}

        <footer className="soldier-footer">
          <button
            className="mode-switch return-command"
            type="button"
            onClick={handleReturnToCommand}
            disabled={returnLoading}
          >
            <span>RETORNAR AO COMANDO</span>
            <strong>{returnLoading ? "AGUARDE" : "GENERAL"}</strong>
          </button>
        </footer>
      </section>
    </TacticalShell>
  );
}
