import React, { useState } from "react"

import ConfirmDialog from "../../../components/ui/ConfirmDialog"
import StatusNotice from "../../../components/ui/StatusNotice"
import TacticalShell from "../../../components/tactical/TacticalShell"
import { emptyStatus } from "../../../constants/uiState"
import MissionForm from "../../missions/components/MissionForm"
import ObjetivoForm from "../components/ObjetivoForm"
import ObjetivoList from "../components/ObjetivoList"
import { useObjectives } from "../hooks/useObjectives"

export default function ObjectivesPage({ board, onBack, onUnauthorized, token, user }) {
  const objectives = useObjectives({ onUnauthorized, token })
  const [editingObjetivo, setEditingObjetivo] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [missionObjetivo, setMissionObjetivo] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const busy = objectives.loading || objectives.mutating

  function closeObjectiveForm() {
    setFormOpen(false)
    setEditingObjetivo(null)
  }

  async function submitObjetivo(payload) {
    const saved = editingObjetivo
      ? await objectives.updateObjetivo(editingObjetivo.id, payload)
      : await objectives.createObjetivo(payload)
    if (saved) {
      closeObjectiveForm()
    }
  }

  async function createMission(payload) {
    const saved = await board.createMission(payload)
    if (saved) {
      setMissionObjetivo(null)
      await objectives.refresh()
    }
  }

  function moveObjetivoToTop(objetivoId) {
    const reordered = [...objectives.objetivos]
    const index = reordered.findIndex((objetivo) => objetivo.id === objetivoId)
    if (index <= 0) {
      return
    }
    const [selected] = reordered.splice(index, 1)
    reordered.unshift(selected)
    objectives.reorderObjetivos(reordered.map((objetivo) => objetivo.id))
  }

  return (
    <TacticalShell mode="general">
      <section className="objectives-page">
        <div className="actions-row">
          <button className="button secondary compact" type="button" onClick={onBack}>
            VOLTAR AO GENERAL
          </button>
        </div>

        <header className="section-heading">
          <div>
            <p className="section-kicker fire">PLANEJAMENTO</p>
            <h1>Objetivos</h1>
            <p className="muted">
              Direções independentes que podem receber ordens quando necessário.
            </p>
          </div>
          <button
            className="button fire compact"
            disabled={busy}
            type="button"
            onClick={() => {
              setEditingObjetivo(null)
              setFormOpen(true)
            }}
          >
            NOVO OBJETIVO
          </button>
        </header>

        <StatusNotice status={objectives.status} />

        {formOpen && (
          <section className="panel">
            <ObjetivoForm
              editingObjetivo={editingObjetivo}
              loading={busy}
              onCancel={closeObjectiveForm}
              onSubmit={submitObjetivo}
            />
          </section>
        )}

        <ObjetivoList
          loading={busy}
          missionCounts={objectives.missionCounts}
          objetivos={objectives.objetivos}
          onCreateMission={setMissionObjetivo}
          onDelete={setDeleteTarget}
          onEdit={(objetivo) => {
            setEditingObjetivo(objetivo)
            setFormOpen(true)
          }}
          onMoveToTop={moveObjetivoToTop}
          onUpdateStatus={objectives.updateObjetivoStatus}
        />

        {missionObjetivo && (
          <section className="panel mission-form">
            <div className="section-heading compact">
              <div>
                <p className="section-kicker fire">ORDEM DO OBJETIVO</p>
                <h2>{missionObjetivo.titulo}</h2>
              </div>
            </div>
            <MissionForm
              currentUser={user}
              initialObjetivoId={missionObjetivo.id}
              initialObjetivoTitulo={missionObjetivo.titulo}
              lockObjetivo
              loading={board.formLoading}
              onCancel={() => {
                setMissionObjetivo(null)
                board.setFormStatus(emptyStatus)
              }}
              onCreate={createMission}
              onUnauthorized={onUnauthorized}
              status={board.formStatus}
              token={token}
              timezone={user?.timezone}
            />
          </section>
        )}

        {deleteTarget && (
          <ConfirmDialog
            confirmLabel="REMOVER"
            message={`"${deleteTarget.titulo}" será removido. As ordens vinculadas perderão esse vínculo.`}
            title="Remover objetivo"
            variant="danger"
            onCancel={() => setDeleteTarget(null)}
            onConfirm={async () => {
              const removed = await objectives.deleteObjetivo(deleteTarget.id)
              if (removed) {
                setDeleteTarget(null)
              }
            }}
          />
        )}
      </section>
    </TacticalShell>
  )
}
