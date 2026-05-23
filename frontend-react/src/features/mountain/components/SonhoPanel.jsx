import React, { useMemo, useState } from "react";

import MountainDialog from "./MountainDialog.jsx";
import ObjetivoCard from "./ObjetivoCard.jsx";
import ObjetivoForm from "./ObjetivoForm.jsx";
import SonhoArquivarDialog from "./SonhoArquivarDialog.jsx";
import SonhoForm from "./SonhoForm.jsx";

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
  onUpdateObjetivo,
  onUpdateObjetivoProgress,
  onUpdateObjetivoStatus,
  onUpdate,
  sonhos,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingSonho, setEditingSonho] = useState(null);
  const [initialTipo, setInitialTipo] = useState("principal");
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [objetivoSonho, setObjetivoSonho] = useState(null);
  const principal = useMemo(
    () => sonhos.find((sonho) => sonho.status === "ativo" && sonho.tipo === "principal"),
    [sonhos]
  );
  const secundarios = useMemo(
    () => sonhos.filter((sonho) => sonho.status === "ativo" && sonho.tipo === "secundario"),
    [sonhos]
  );
  const hasActivePrincipal = Boolean(principal);
  const objetivosPorSonho = useMemo(
    () => (objetivos || []).reduce((groups, objetivo) => {
      if (!objetivo.sonho_id) {
        return groups;
      }
      const key = String(objetivo.sonho_id);
      groups[key] = groups[key] || [];
      groups[key].push(objetivo);
      return groups;
    }, {}),
    [objetivos]
  );

  async function submit(payload) {
    const saved = editingSonho
      ? await onUpdate?.(editingSonho.id, payload)
      : await onCreate?.(payload);
    if (saved) {
      setFormOpen(false);
      setEditingSonho(null);
    }
  }

  function openCreateForm(tipo = hasActivePrincipal ? "secundario" : "principal") {
    setEditingSonho(null);
    setInitialTipo(tipo);
    setFormOpen(true);
  }

  async function submitPromote(sonho) {
    const promoted = await onPromote?.(sonho.id);
    if (promoted) {
      setFormOpen(false);
      setEditingSonho(null);
    }
  }

  async function submitObjetivo(payload) {
    const saved = await onCreateObjetivo?.(payload);
    if (saved) {
      setObjetivoSonho(null);
    }
  }

  function renderObjetivosDoSonho(sonho) {
    const vinculados = objetivosPorSonho[String(sonho.id)] || [];
    return (
      <div className="sonho-objective-branch">
        {vinculados.length > 0 && <div className="branch-line" aria-hidden="true" />}
        {vinculados.length === 0 ? (
          null
        ) : (
          <div className="objetivo-list nested">
            {vinculados.map((objetivo) => (
              <ObjetivoCard
                key={objetivo.id}
                loading={loading}
                missions={missions.filter((mission) => mission.objetivo_id === objetivo.id)}
                objetivo={objetivo}
                onDelete={onDeleteObjetivo}
                onCreateMission={onCreateMission}
                onUpdate={onUpdateObjetivo}
                onUpdateProgress={onUpdateObjetivoProgress}
                onUpdateStatus={onUpdateObjetivoStatus}
                sonhos={sonhos}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="mountain-section">
      <div className="mountain-section-head">
        <div>
          <p className="section-kicker fire">SONHOS</p>
          <h2>Topo da montanha</h2>
        </div>
        <button className="button fire compact" disabled={loading} type="button" onClick={() => openCreateForm()}>
          {hasActivePrincipal ? "ADICIONAR SONHO SECUNDÁRIO" : "NOVO SONHO"}
        </button>
      </div>

      {formOpen && (
        <MountainDialog
          label={editingSonho ? "Editar sonho" : "Novo sonho"}
          onClose={() => {
            setFormOpen(false);
            setEditingSonho(null);
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
              setFormOpen(false);
              setEditingSonho(null);
            }}
            onPromote={submitPromote}
            onRequestArchive={(sonho) => setArchiveTarget(sonho)}
            onSubmit={submit}
          />
        </MountainDialog>
      )}

      <div className="mountain-tree">
        <article className={principal ? "sonho-principal-spotlight sonho-card principal" : "sonho-principal-spotlight sonho-card principal empty"}>
          <span className="meta-tag critical">PRINCIPAL</span>
          <h3>{principal?.titulo || "Nenhum sonho principal definido."}</h3>
          <p>{principal?.descricao || "Defina a campanha estratégica que orienta o comando."}</p>
          <div className="mountain-card-actions">
            {principal ? (
              <>
                <button className="button fire compact" disabled={loading} type="button" onClick={() => setObjetivoSonho(principal)}>
                  + NOVO OBJETIVO
                </button>
                <button className="button secondary compact mountain-admin-action" disabled={loading} type="button" onClick={() => {
                  setEditingSonho(principal);
                  setFormOpen(true);
                }}>
                  EDITAR
                </button>
              </>
            ) : (
              <button className="button fire compact" disabled={loading} type="button" onClick={() => openCreateForm("principal")}>
                CRIAR SONHO PRINCIPAL
              </button>
            )}
          </div>
        </article>

        {principal && renderObjetivosDoSonho(principal)}
      </div>

      {secundarios.length > 0 && (
        <section className="sonho-secondary-section">
          <div className="objetivo-group-title">
            <h3>SONHOS SECUNDÁRIOS</h3>
            <span>{secundarios.length}</span>
          </div>
          <div className="sonho-secondary-list">
            {secundarios.map((sonho) => (
              <article className="sonho-card secondary" key={sonho.id}>
                <span className="meta-tag">SECUNDÁRIO</span>
                <h3>{sonho.titulo}</h3>
                {sonho.descricao && <p>{sonho.descricao}</p>}
                <div className="mountain-card-actions">
                  <button className="button fire compact" disabled={loading} type="button" onClick={() => setObjetivoSonho(sonho)}>
                    + NOVO OBJETIVO
                  </button>
                  <button className="button secondary compact mountain-admin-action" disabled={loading} type="button" onClick={() => {
                    setEditingSonho(sonho);
                    setFormOpen(true);
                  }}>
                    EDITAR
                  </button>
                </div>
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

      {archiveTarget && (
        <SonhoArquivarDialog
          loading={loading}
          sonho={archiveTarget}
          onCancel={() => setArchiveTarget(null)}
          onConfirm={async (payload) => {
            const archived = await onArchive?.(archiveTarget.id, payload);
            if (archived) {
              setArchiveTarget(null);
              setFormOpen(false);
              setEditingSonho(null);
            }
          }}
        />
      )}
    </section>
  );
}
