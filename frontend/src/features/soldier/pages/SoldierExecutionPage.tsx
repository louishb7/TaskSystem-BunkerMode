import React from "react"

import EmptyState from "../../../components/ui/EmptyState"
import StatusNotice from "../../../components/ui/StatusNotice"
import { isCompleted } from "../../../utils/missionStatus"
import { formatCurrentDay } from "../../calendar/calendarUtils"
import MissionCard from "../../missions/components/MissionCard"

export default function SoldierExecutionPage({
  actionMissions,
  board,
  dailyMissions,
  timezone,
}) {
  const allDailyMissionsCompleted =
    dailyMissions.length > 0 && dailyMissions.every(isCompleted)

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">Execução</h1>
        <p className="mt-2 mb-0 text-sm text-text-secondary">
          {formatCurrentDay(timezone).toLocaleLowerCase("pt-BR")}
        </p>
      </header>

      <StatusNotice status={board.status} />

      <section className="grid gap-4" aria-labelledby="soldier-orders-title">
        <h2 id="soldier-orders-title" className="m-0 text-lg font-semibold normal-case text-text-primary">
          Ordens de hoje
        </h2>

        {board.missionLoading && (
          <EmptyState
            title="Sincronizando ordens"
            message="Carregando as ordens programadas para hoje."
          />
        )}

        {!board.missionLoading && dailyMissions.length > 0 && (
          <div className="grid gap-3">
            {dailyMissions.map((mission) => (
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
                message="Não há nada programado para execução neste dia."
              />
            ) : allDailyMissionsCompleted ? (
              <EmptyState
                title="Todas as ordens foram concluídas"
                message="Você concluiu as ordens de hoje."
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
    </section>
  )
}
