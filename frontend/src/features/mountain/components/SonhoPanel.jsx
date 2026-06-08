import React, { useMemo, useState } from "react"

import MountainDialog from "./MountainDialog.jsx"
import ObjetivoCard from "./ObjetivoCard.jsx"
import ObjetivoForm from "./ObjetivoForm.jsx"
import SonhoArquivarDialog from "./SonhoArquivarDialog.jsx"
import SonhoForm from "./SonhoForm.jsx"
import MissionForm from "../../missions/components/MissionForm.jsx"

function isRecurringMission(mission) {
  return Array.isArray(mission?.recurrence_weekdays) && mission.recurrence_weekdays.length > 0
}

function directSonhoMissionKey(mission) {
  if (!isRecurringMission(mission)) {
    return `missao:${mission?.id}`
  }
  return [
    "sonho-recorrente",
    mission.sonho_id || "",
    mission.titulo || "",
    mission.instrucao || "",
    [...mission.recurrence_weekdays].sort().join(","),
    mission.duration_type || "",
    mission.recurrence_end_date || "",
  ].join("|")
}

function missionDateValue(mission) {
  const [day, month, year] = String(mission?.prazo || "")
    .split("-")
    .map(Number)
  if (!day || !month || !year) {
    return Number.MAX_SAFE_INTEGER
  }
  return new Date(year, month - 1, day).getTime()
}

function missionStatusLabel(mission) {
  return mission?.status_code === "CONCLUIDA"
    ? "Cumprida"
    : mission?.status_label || mission?.status_code || "Pendente"
}

function sortObjetivosByOrder(objetivos = []) {
  return [...objetivos].sort((a, b) => {
    const orderDiff = Number(a.order_index || 0) - Number(b.order_index || 0)
    if (orderDiff !== 0) {
      return orderDiff
    }
    return Number(a.id || 0) - Number(b.id || 0)
  })
}

function summarizeDirectSonhoMissions(missions) {
  const groups = new Map()
  missions.forEach((mission) => {
    const key = directSonhoMissionKey(mission)
    const current = groups.get(key) || []
    current.push(mission)
    groups.set(key, current)
  })

  return Array.from(groups.entries())
    .map(([key, group]) => {
      const sorted = [...group].sort((a, b) => missionDateValue(a) - missionDateValue(b))
      const representative =
        sorted.find((mission) => mission.status_code !== "CONCLUIDA") || sorted[0]
      return { key, mission: representative }
    })
    .sort((a, b) => missionDateValue(a.mission) - missionDateValue(b.mission))
}

export default function SonhoPanel({
  loading,
  missions = [],
  onArchive,
  onCreateObjetivo,
  onCreate,
  onCreateMission,
  objetivos,
  onDeleteObjetivo,
  onPromote,
  onReorderObjetivos,
  onUpdateObjetivo,
  onUpdateObjetivoStatus,
  onUpdate,
  sonhos,
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingSonho, setEditingSonho] = useState(null)
  const [initialTipo, setInitialTipo] = useState("principal")
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [objetivoSonho, setObjetivoSonho] = useState(null)
  const [ordemSonho, setOrdemSonho] = useState(null)
  const principal = useMemo(
    () => sonhos.find((sonho) => sonho.status === "ativo" && sonho.tipo === "principal"),
    [sonhos]
  )
  const secundarios = useMemo(
    () => sonhos.filter((sonho) => sonho.status === "ativo" && sonho.tipo === "secundario"),
    [sonhos]
  )
  const hasActivePrincipal = Boolean(principal)
  const objetivosPorSonho = useMemo(
    () =>
      (objetivos || []).reduce((groups, objetivo) => {
        if (!objetivo.sonho_id) {
          return groups
        }
        const key = String(objetivo.sonho_id)
        groups[key] = groups[key] || []
        groups[key].push(objetivo)
        return groups
      }, {}),
    [objetivos]
  )
  const missionsPorObjetivo = useMemo(
    () =>
      (missions || []).reduce((groups, mission) => {
        if (!mission.objetivo_id) {
          return groups
        }
        const key = String(mission.objetivo_id)
        groups[key] = groups[key] || []
        groups[key].push(mission)
        return groups
      }, {}),
    [missions]
  )
  const missionsPorSonho = useMemo(
    () =>
      (missions || []).reduce((groups, mission) => {
        if (!mission.sonho_id || mission.objetivo_id) {
          return groups
        }
        const key = String(mission.sonho_id)
        groups[key] = groups[key] || []
        groups[key].push(mission)
        return groups
      }, {}),
    [missions]
  )

  async function submit(payload) {
    const saved = editingSonho
      ? await onUpdate?.(editingSonho.id, payload)
      : await onCreate?.(payload)
    if (saved) {
      setFormOpen(false)
      setEditingSonho(null)
    }
  }

  function openCreateForm(tipo = hasActivePrincipal ? "secundario" : "principal") {
    setEditingSonho(null)
    setInitialTipo(tipo)
    setFormOpen(true)
  }

  async function submitPromote(sonho) {
    const promoted = await onPromote?.(sonho.id)
    if (promoted) {
      setFormOpen(false)
      setEditingSonho(null)
    }
  }

  async function submitObjetivo(payload) {
    const saved = await onCreateObjetivo?.(payload)
    if (saved) {
      setObjetivoSonho(null)
    }
  }

  async function submitOrdemDoSonho(payload) {
    const saved = await onCreateMission?.({
      ...payload,
      sonho_id: ordemSonho.id,
      objetivo_id: null,
    })
    if (saved) {
      setOrdemSonho(null)
    }
  }

  function renderOrdensDiretasDoSonho(sonho) {
    const ordens = summarizeDirectSonhoMissions(missionsPorSonho[String(sonho.id)] || [])
    if (ordens.length === 0) {
      return null
    }
    return (
      <div className="mountain-direct-orders objective-linked-missions sonho-direct-orders compact">
        <p className="section-kicker fire">
          {sonho.tipo === "principal" ? "ORDENS DIRETAS DO TOPO" : "ORDENS DIRETAS DA ROTA"}
        </p>
        {ordens.map(({ key, mission }) => (
          <div className="objective-linked-mission" key={key}>
            <strong>{mission.titulo || "Sem título"}</strong>
            <span>{missionStatusLabel(mission)}</span>
          </div>
        ))}
      </div>
    )
  }

  function renderObjetivosDoSonho(sonho) {
    const vinculados = sortObjetivosByOrder(objetivosPorSonho[String(sonho.id)] || [])
    function moveObjetivoToTop(index) {
      if (index <= 0 || index >= vinculados.length) {
        return
      }
      const reordered = [...vinculados]
      const [selected] = reordered.splice(index, 1)
      reordered.unshift(selected)
      onReorderObjetivos?.(reordered.map((objetivo) => objetivo.id))
    }

    return (
      <div className="sonho-objective-branch mountain-ascent-path">
        {vinculados.length > 0 && (
          <div className="branch-line mountain-path-line" aria-hidden="true" />
        )}
        {vinculados.length > 0 && (
          <div className="objetivo-list nested mountain-camp-list">
            {vinculados.map((objetivo, index) => (
              <div className="mountain-camp-node" key={objetivo.id}>
                <ObjetivoCard
                  loading={loading}
                  missions={missionsPorObjetivo[String(objetivo.id)] || []}
                  objetivo={objetivo}
                  onDelete={onDeleteObjetivo}
                  onCreateMission={onCreateMission}
                  onUpdate={onUpdateObjetivo}
                  onUpdateStatus={onUpdateObjetivoStatus}
                  onMoveToTop={index > 0 ? () => moveObjetivoToTop(index) : null}
                  sonhos={sonhos}
                />
              </div>
            ))}
          </div>
        )}
        {vinculados.length === 0 && (
          <p className="mountain-empty-route muted">
            {sonho.tipo === "principal"
              ? "Topo definido. A rota ainda não tem acampamentos."
              : "Rota secundária sem acampamentos definidos."}
          </p>
        )}
      </div>
    )
  }

  return (
    <section className="mountain-section mountain-command-map">
      <div className="mountain-section-head">
        <div>
          <p className="section-kicker fire">MAPA DE ASCENSÃO</p>
          <h2>Topo, rotas e acampamentos</h2>
        </div>
        <button
          className="button fire compact"
          disabled={loading}
          type="button"
          onClick={() => openCreateForm()}
        >
          {hasActivePrincipal ? "ADICIONAR SONHO SECUNDÁRIO" : "NOVO SONHO"}
        </button>
      </div>

      {formOpen && (
        <MountainDialog
          label={editingSonho ? "Editar sonho" : "Novo sonho"}
          onClose={() => {
            setFormOpen(false)
            setEditingSonho(null)
          }}
        >
          <div className="section-heading compact">
            <div>
              <p className="section-kicker fire">{editingSonho ? "EDITAR SONHO" : "NOVO SONHO"}</p>
              <h2>{editingSonho ? editingSonho.titulo : "Registrar direção estratégica"}</h2>
            </div>
          </div>
          <SonhoForm
            editingSonho={editingSonho}
            hasActivePrincipal={hasActivePrincipal}
            initialTipo={initialTipo}
            loading={loading}
            onCancel={() => {
              setFormOpen(false)
              setEditingSonho(null)
            }}
            onPromote={submitPromote}
            onRequestArchive={(sonho) => setArchiveTarget(sonho)}
            onSubmit={submit}
          />
        </MountainDialog>
      )}

      <div className="mountain-tree">
        <article
          className={
            principal
              ? "sonho-principal-spotlight sonho-card principal mountain-hero-summit"
              : "sonho-principal-spotlight sonho-card principal mountain-hero-summit empty"
          }
        >
          <div className="mountain-summit-label">
            <span>TOPO DA MONTANHA</span>
            <span className="meta-tag critical">SONHO PRINCIPAL</span>
          </div>
          <h3>{principal?.titulo || "Nenhum topo definido"}</h3>
          <p>
            {principal?.descricao ||
              "Defina a campanha estratégica que orienta a escalada operacional."}
          </p>
          <div className="mountain-card-actions">
            {principal ? (
              <>
                <button
                  className="button fire compact"
                  disabled={loading}
                  type="button"
                  onClick={() => setObjetivoSonho(principal)}
                >
                  NOVO OBJETIVO
                </button>
                <button
                  className="button secondary compact"
                  disabled={loading}
                  type="button"
                  onClick={() => setOrdemSonho(principal)}
                >
                  ORDEM DIRETA
                </button>
                <button
                  className="button secondary compact mountain-admin-action"
                  disabled={loading}
                  type="button"
                  onClick={() => {
                    setEditingSonho(principal)
                    setFormOpen(true)
                  }}
                >
                  EDITAR
                </button>
              </>
            ) : (
              <button
                className="button fire compact"
                disabled={loading}
                type="button"
                onClick={() => openCreateForm("principal")}
              >
                DEFINIR TOPO
              </button>
            )}
          </div>
        </article>
        {principal && renderOrdensDiretasDoSonho(principal)}

        {principal && renderObjetivosDoSonho(principal)}
      </div>

      {secundarios.length > 0 && (
        <section className="sonho-secondary-section mountain-route-secondary">
          <div className="objetivo-group-title">
            <h3>ROTAS SECUNDÁRIAS</h3>
            <span>{secundarios.length}</span>
          </div>
          <div className="sonho-secondary-list">
            {secundarios.map((sonho) => (
              <article className="sonho-card secondary" key={sonho.id}>
                <span className="meta-tag">ROTA SECUNDÁRIA</span>
                <h3>{sonho.titulo}</h3>
                {sonho.descricao && <p>{sonho.descricao}</p>}
                <div className="mountain-card-actions">
                  <button
                    className="button fire compact"
                    disabled={loading}
                    type="button"
                    onClick={() => setObjetivoSonho(sonho)}
                  >
                    NOVO OBJETIVO
                  </button>
                  <button
                    className="button secondary compact"
                    disabled={loading}
                    type="button"
                    onClick={() => setOrdemSonho(sonho)}
                  >
                    ORDEM DIRETA
                  </button>
                  <button
                    className="button secondary compact mountain-admin-action"
                    disabled={loading}
                    type="button"
                    onClick={() => {
                      setEditingSonho(sonho)
                      setFormOpen(true)
                    }}
                  >
                    EDITAR
                  </button>
                </div>
                {renderOrdensDiretasDoSonho(sonho)}
                {renderObjetivosDoSonho(sonho)}
              </article>
            ))}
          </div>
        </section>
      )}

      {objetivoSonho && (
        <MountainDialog label="Novo objetivo" onClose={() => setObjetivoSonho(null)}>
          <div className="section-heading compact">
            <div>
              <p className="section-kicker fire">NOVO OBJETIVO</p>
              <h3>{objetivoSonho.titulo}</h3>
            </div>
          </div>
          <ObjetivoForm
            initialSonhoId={objetivoSonho.id}
            loading={loading}
            onCancel={() => setObjetivoSonho(null)}
            onSubmit={submitObjetivo}
          />
        </MountainDialog>
      )}

      {ordemSonho && (
        <MountainDialog label="Nova ordem do sonho" onClose={() => setOrdemSonho(null)}>
          <div className="objective-order-context">
            <p className="section-kicker fire">ORDEM DO SONHO</p>
            <h2>{ordemSonho.titulo}</h2>
            <p className="muted">
              Esta ordem contribui diretamente para o sonho, sem passar por um objetivo
              intermediário.
            </p>
          </div>
          <MissionForm
            initialSonhoId={ordemSonho.id}
            initialSonhoTitulo={ordemSonho.titulo}
            lockSonho
            loading={loading}
            onCancel={() => setOrdemSonho(null)}
            onCreate={submitOrdemDoSonho}
            status={{ type: "", message: "" }}
          />
        </MountainDialog>
      )}

      {archiveTarget && (
        <SonhoArquivarDialog
          loading={loading}
          sonho={archiveTarget}
          onCancel={() => setArchiveTarget(null)}
          onConfirm={async (payload) => {
            const archived = await onArchive?.(archiveTarget.id, payload)
            if (archived) {
              setArchiveTarget(null)
              setFormOpen(false)
              setEditingSonho(null)
            }
          }}
        />
      )}
    </section>
  )
}
