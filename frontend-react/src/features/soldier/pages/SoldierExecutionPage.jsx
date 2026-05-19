import React, { useState } from "react";

import EmptyState from "../../../components/ui/EmptyState.jsx";
import LionEmblem from "../../../components/ui/LionEmblem.jsx";
import StatusNotice from "../../../components/ui/StatusNotice.jsx";
import TacticalShell from "../../../components/tactical/TacticalShell.jsx";
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
  const remainingOrders = actionMissions.length;
  const turn = board.operationalTurn;
  const showTurnWarning = turn?.requires_decision === true && !board.operationalTurnAcknowledged;
  const turnDateLabel = formatOperationalTurnDate(turn?.active_date_label);

  async function handleReturnToCommand() {
    setReturnLoading(true);
    await onReturnToCommand();
    setReturnLoading(false);
  }

  return (
    <TacticalShell mode="soldier">
      <section className="soldier-layout">
        <header className="soldier-header">
          <div className="soldier-topline">
            <span>FOCO OPERACIONAL</span>
            <span>EXECUÇÃO</span>
          </div>
          <div className="soldier-briefing">
            <LionEmblem variant="hero" />
            <div className="soldier-briefing-copy">
              <h1>LEÃO DO DIA</h1>
              <div className="soldier-briefing-meta">
                <span>{turnDateLabel}</span>
                <strong>
                  {remainingOrders === 0
                    ? "CAÇADA CONCLUÍDA"
                    : "ORDENS EM EXECUÇÃO"}
                </strong>
              </div>
              <p className="soldier-focus-note">Interface reduzida para manter ritmo, ação e continuidade.</p>
              <MissionProgress label="CAÇADA" missions={dailyMissions.length > 0 ? dailyMissions : missions} />
            </div>
          </div>
        </header>

        <StatusNotice status={board.status} />

        {showTurnWarning && (
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
        )}

        {board.missionLoading ? (
          <EmptyState
            title="Sincronizando ordens"
            message="O foco operacional está sincronizando o quadro."
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
            title={dailyMissions.length > 0 ? "Caçada concluída" : "Nenhuma ordem para hoje"}
            message={
              dailyMissions.length > 0
                ? "Todos os leões do dia foram abatidos."
                : "O General não definiu missões para este dia."
            }
          />
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
