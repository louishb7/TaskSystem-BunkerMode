import React from "react"

import Button from "../../../components/ui/Button"
import Dialog from "../../../components/ui/Dialog"
import { formatCurrentDay } from "../../calendar/calendarUtils"

export default function ActivateSoldierDialog({
  loading,
  onCancel,
  onConfirm,
  todayMissions = [],
  timezone,
}) {
  const completedMissions = todayMissions.filter(
    (mission) => String(mission?.status_code || "").toUpperCase() === "CONCLUIDA"
  )
  const pendingMissions = todayMissions.filter((mission) => {
    const statusCode = String(mission?.status_code || "").toUpperCase()
    return !statusCode.startsWith("FALHA") && statusCode !== "CONCLUIDA"
  })

  return (
    <Dialog closeOnBackdrop={false} onClose={onCancel} title={formatCurrentDay(timezone)}>
      <div className="grid gap-4">
        <p className="m-0 text-xs font-semibold tracking-wide text-text-secondary">ORDENS DE HOJE</p>
        {todayMissions.length > 0 ? (
          <ul className="m-0 grid list-none gap-2 rounded-control border border-border bg-app p-3 text-sm text-text-primary">
            {pendingMissions.map((mission) => (
              <li key={mission.id}>{mission?.titulo || "Missão sem título"}</li>
            ))}
            {completedMissions.map((mission) => (
              <li className="text-text-secondary line-through" key={mission.id}>
                {mission?.titulo || "Missão sem título"}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-control border border-border bg-app p-3 text-sm text-text-secondary">
            Nenhuma missão definida para hoje
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={loading} variant="secondary" onClick={onCancel}>
            CANCELAR
          </Button>
          <Button loading={loading} onClick={onConfirm}>
            {loading ? "ATIVANDO" : "ENTRAR NO SOLDADO"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
