import React from "react"

import Button from "../../../components/ui/Button"
import EmptyState from "../../../components/ui/EmptyState"
import { isCompleted } from "../../../utils/missionStatus"
import MissionCard from "../../missions/components/MissionCard"

function isFailure(mission) {
  return String(mission?.status_code || "").startsWith("FALHA")
}

function groupMissions(missions) {
  const open = missions.filter((mission) => !isCompleted(mission) && !isFailure(mission))
  return {
    open: [
      ...open.filter((mission) => mission?.is_pinned === true),
      ...open.filter((mission) => mission?.is_pinned !== true),
    ],
    failures: missions.filter(isFailure),
    completed: missions.filter(isCompleted),
  }
}

export default function TasksPanel({
  completeLoadingId,
  failLoadingId,
  loading,
  onCompleteMission,
  onCreateTask,
  onDeleteMission,
  onEditMission,
  onFailMission,
  onReopenMission,
  onTogglePin,
  pinLoadingId,
  reopenLoadingId,
  selectedDate,
  selectedMissions,
  timezone,
}) {
  const groups = groupMissions(selectedMissions)
  function renderMissionGroup(label, missions) {
    if (missions.length === 0) {
      return null
    }

    return (
      <section className="grid gap-3">
        <h3 className="m-0 text-base font-semibold normal-case text-text-primary">{label}</h3>
        <div className="grid gap-3">
          {missions.map((mission) => (
            <MissionCard
              key={mission.id}
              completing={completeLoadingId === mission.id}
              failing={failLoadingId === mission.id}
              mission={mission}
              onComplete={() => onCompleteMission(mission)}
              onDelete={() => onDeleteMission(mission)}
              onEdit={() => onEditMission(mission)}
              onFail={() => onFailMission(mission.id)}
              onReopen={() => onReopenMission(mission)}
              onTogglePin={() => onTogglePin(mission)}
              pinning={pinLoadingId === mission.id}
              reopening={reopenLoadingId === mission.id}
              timezone={timezone}
              variant="tasks"
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="m-0 text-xl font-semibold normal-case text-text-primary">
            Tarefas de{" "}
            {selectedDate.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
            })}
          </h2>
        </div>
        <Button onClick={onCreateTask}>Nova tarefa</Button>
      </div>

      {loading ? (
        <EmptyState
          title="Sincronizando tarefas"
          message="Carregando tarefas do dia selecionado."
        />
      ) : selectedMissions.length > 0 ? (
        <div className="grid gap-8">
          {renderMissionGroup("Tarefas abertas", groups.open)}
          {renderMissionGroup("Concluídas", groups.completed)}
          {renderMissionGroup("Falhas registradas", groups.failures)}
        </div>
      ) : (
        <EmptyState
          message="Nenhuma tarefa foi definida para o dia selecionado."
          title="Sem tarefas neste dia"
        />
      )}
    </section>
  )
}
