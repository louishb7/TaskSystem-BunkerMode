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
    <Dialog closeOnBackdrop={false} onClose={onCancel} title="Entrar no Soldado">
      <div className="grid gap-4">
        <p className="m-0 text-sm text-text-secondary">{formatCurrentDay(timezone)}</p>
        <p className="m-0 text-sm font-medium text-text-primary">Ordens de hoje</p>
        {todayMissions.length > 0 ? (
          <ul className="m-0 grid list-none gap-2 rounded-control border border-border bg-app p-3 text-sm text-text-primary">
            {pendingMissions.map((mission) => (
              <li key={mission.id}>{mission?.titulo || "Ordem sem título"}</li>
            ))}
            {completedMissions.map((mission) => (
              <li className="text-text-secondary line-through" key={mission.id}>
                {mission?.titulo || "Ordem sem título"}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-control border border-border bg-app p-3 text-sm text-text-secondary">
            Nenhuma ordem definida para hoje
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={loading} variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button loading={loading} onClick={onConfirm}>
            {loading ? "Entrando" : "Entrar no Soldado"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
