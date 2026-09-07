import React from "react"

import EmptyState from "../../../components/ui/EmptyState"
import StatusNotice from "../../../components/ui/StatusNotice"
import { isCompleted } from "../../../utils/missionStatus"
import { formatCurrentDay } from "../../calendar/calendarUtils"
import MissionCard from "../../missions/components/MissionCard"

export default function FocusPage({ actionMissions, board, dailyMissions, timezone }) {
  const allDailyMissionsCompleted = dailyMissions.length > 0 && dailyMissions.every(isCompleted)

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          Modo Foco
        </h1>
        <p className="mt-2 mb-0 text-sm text-text-secondary">
          {formatCurrentDay(timezone).toLocaleLowerCase("pt-BR")}
        </p>
      </header>

      <StatusNotice status={board.status} />

      <section className="grid gap-4" aria-labelledby="focus-tasks-title">
        <h2
          id="focus-tasks-title"
          className="m-0 text-lg font-semibold normal-case text-text-primary"
        >
          Tarefas de hoje
        </h2>

        {board.missionLoading && (
          <EmptyState
            title="Sincronizando tarefas"
            message="Carregando as tarefas programadas para hoje."
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
                variant="focus"
              />
            ))}
          </div>
        )}

        {!board.missionLoading && actionMissions.length === 0 && (
          <>
            {dailyMissions.length === 0 ? (
              <EmptyState
                title="Nenhuma tarefa para hoje"
                message="Não há nada programado para execução neste dia."
              />
            ) : allDailyMissionsCompleted ? (
              <EmptyState
                title="Todas as tarefas foram concluídas"
                message="Você concluiu as tarefas de hoje."
              />
            ) : (
              <EmptyState
                title="Sem tarefas em aberto"
                message="Não há mais ações disponíveis para as tarefas de hoje."
              />
            )}
          </>
        )}
      </section>
    </section>
  )
}
