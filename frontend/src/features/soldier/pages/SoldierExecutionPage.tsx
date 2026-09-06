import React, { useState } from "react"

import EmptyState from "../../../components/ui/EmptyState"
import StatusNotice from "../../../components/ui/StatusNotice"
import TacticalShell from "../../../components/tactical/TacticalShell"
import { isCompleted } from "../../../utils/missionStatus"
import { formatCurrentDay } from "../../calendar/calendarUtils"
import MissionCard, { MissionProgress } from "../../missions/components/MissionCard"

export default function SoldierExecutionPage({
  actionMissions,
  board,
  dailyMissions,
  missions,
  onReturnToCommand,
}) {
  const [returnLoading, setReturnLoading] = useState(false)
  const hasCompletedMissions = dailyMissions.some(isCompleted)

  async function handleReturnToCommand() {
    setReturnLoading(true)
    await onReturnToCommand()
    setReturnLoading(false)
  }

  return (
    <TacticalShell mode="soldier">
      <section className="soldier-layout">
        <header className="soldier-header">
          <div className="soldier-topline">
            <span>FOCO OPERACIONAL</span>
          </div>
          <div className="soldier-briefing">
            <div className="soldier-briefing-copy">
              <h1>Ordens de hoje</h1>
              <div className="soldier-briefing-meta">
                <span>{formatCurrentDay()}</span>
              </div>
              <MissionProgress
                label="PROGRESSO"
                missions={dailyMissions.length > 0 ? dailyMissions : missions}
              />
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
            {actionMissions.map((mission) => (
              <MissionCard
                key={mission.id}
                completing={board.completeLoadingId === mission.id}
                failing={board.failLoadingId === mission.id}
                mission={mission}
                onComplete={() => board.completeMission(mission)}
                onFail={() => board.failMission(mission.id)}
                variant="soldier"
              />
            ))}
          </div>
        )}

        {!board.missionLoading && actionMissions.length === 0 && (
          <>
            {dailyMissions.length === 0 ? (
              <EmptyState
                title="Nenhuma ordem para hoje"
                message="O General não definiu missões para este dia."
              />
            ) : hasCompletedMissions ? (
              <EmptyState
                title="Ordens concluídas"
                message="Todas as ordens do dia foram concluídas."
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
  )
}
