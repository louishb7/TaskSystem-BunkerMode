import React from "react"

import EmptyState from "../../../components/ui/EmptyState"
import StatusNotice from "../../../components/ui/StatusNotice"
import { isCompleted } from "../../../utils/missionStatus"
import { formatCurrentDay } from "../../calendar/calendarUtils"
import MissionCard, { MissionProgress } from "../../missions/components/MissionCard"

export default function SoldierExecutionPage({
  actionMissions,
  board,
  dailyMissions,
  missions,
  timezone,
}) {
  const allDailyMissionsCompleted =
    dailyMissions.length > 0 && dailyMissions.every(isCompleted)

  return (
    <section className="soldier-layout">
        <header className="soldier-header">
          <div className="soldier-topline">
            <span>FOCO OPERACIONAL</span>
          </div>
          <div className="soldier-briefing">
            <div className="soldier-briefing-copy">
              <h1>Ordens de hoje</h1>
              <div className="soldier-briefing-meta">
                <span>{formatCurrentDay(timezone)}</span>
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
                timezone={timezone}
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
            ) : allDailyMissionsCompleted ? (
              <EmptyState
                title="Ordens concluídas"
                message="Todas as ordens do dia foram concluídas."
              />
            ) : (
              <EmptyState
                title="Sem ordens em aberto"
                message="Não há mais ações disponíveis para as ordens de hoje."
              />
            )}
          </>
        )}

    </section>
  )
}
