import React, { useEffect, useMemo, useState } from "react";

import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import MountainDialog from "./MountainDialog.jsx";
import ObjetivoForm from "./ObjetivoForm.jsx";

const statusLabels = {
  ativo: "ATIVO",
  pausado: "PAUSADO",
  abandonado: "ABANDONADO",
  concluido: "CONCLUÍDO",
};

function formatTargetDate(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

function isPastDate(value) {
  if (!value || typeof value !== "string") {
    return false;
  }
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return false;
  }
  return new Date(year, month - 1, day).getTime() < current;
}

export default function ObjetivoCard({
  loading,
  missions = [],
  objetivo,
  onDelete,
  onUpdate,
  onUpdateProgress,
  onUpdateStatus,
  sonhos,
}) {
  const [editing, setEditing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [progressDraft, setProgressDraft] = useState(Number(objetivo.progresso ?? 0));
  const sonho = useMemo(
    () => sonhos.find((item) => item.id === objetivo.sonho_id),
    [objetivo.sonho_id, sonhos]
  );
  const targetLabel = formatTargetDate(objetivo.data_alvo);
  const concludedLabel = formatTargetDate(objetivo.concluded_at?.slice?.(0, 10));
  const pastTarget = isPastDate(objetivo.data_alvo) && objetivo.status === "ativo";
  const progressChanged = progressDraft !== Number(objetivo.progresso ?? 0);
  const active = objetivo.status === "ativo";
  const expanded = !active && detailsOpen;
  const linkedMissions = Array.isArray(missions) ? missions : [];

  useEffect(() => {
    setProgressDraft(Number(objetivo.progresso ?? 0));
  }, [objetivo.progresso]);

  async function submit(payload) {
    const saved = await onUpdate?.(objetivo.id, payload);
    if (saved) {
      setEditing(false);
    }
  }

  async function saveProgress() {
    const saved = await onUpdateProgress?.(objetivo.id, progressDraft);
    if (saved) {
      setManageOpen(false);
    }
  }

  async function changeStatus(status) {
    const saved = await onUpdateStatus?.(objetivo.id, status);
    if (saved) {
      setManageOpen(false);
      setDetailsOpen(false);
    }
  }

  async function removeObjetivo() {
    const removed = await onDelete?.(objetivo.id);
    if (removed) {
      setManageOpen(false);
      setDetailsOpen(false);
    }
  }

  function renderManagementActions({ includeHide = false } = {}) {
    return (
      <div className="objective-management">
        <section className="management-block primary">
          <div>
            <p className="section-kicker fire">PROGRESSO</p>
            <h3>Atualizar avanço</h3>
          </div>
          <label className="compact-slider">
            Progresso: {progressDraft}%
            <input
              disabled={loading}
              max="100"
              min="0"
              onChange={(event) => setProgressDraft(Number(event.target.value))}
              type="range"
              value={progressDraft}
            />
          </label>
          <button
            className="button fire compact"
            disabled={loading || !progressChanged}
            type="button"
            onClick={saveProgress}
          >
            SALVAR PROGRESSO
          </button>
        </section>

        <section className="management-block">
          <div>
            <p className="section-kicker fire">DADOS</p>
            <h3>Editar objetivo</h3>
          </div>
          <button className="button secondary compact" disabled={loading} type="button" onClick={() => {
            setManageOpen(false);
            setEditing(true);
          }}>
            EDITAR TÍTULO E PRAZO
          </button>
        </section>

        <section className="management-block state-actions">
          <div>
            <p className="section-kicker fire">ESTADO</p>
            <h3>Mudar estado do objetivo</h3>
          </div>
          <div className="mountain-card-actions">
            {objetivo.status !== "concluido" && (
              <button
                className="button success compact"
                disabled={loading}
                type="button"
                onClick={() => setConfirmAction("concluir")}
              >
                MARCAR COMO CONCLUÍDO
              </button>
            )}
            {objetivo.status !== "pausado" && objetivo.status !== "concluido" && (
              <button className="button secondary compact" disabled={loading} type="button" onClick={() => changeStatus("pausado")}>
                PAUSAR
              </button>
            )}
            {objetivo.status !== "ativo" && (
              <button className="button secondary compact" disabled={loading} type="button" onClick={() => changeStatus("ativo")}>
                REATIVAR
              </button>
            )}
            {objetivo.status !== "abandonado" && objetivo.status !== "concluido" && (
              <button className="button secondary compact" disabled={loading} type="button" onClick={() => changeStatus("abandonado")}>
                ABANDONAR
              </button>
            )}
            {includeHide && (
              <button className="button secondary compact" type="button" onClick={() => setDetailsOpen(false)}>
                OCULTAR
              </button>
            )}
            <button className="button danger ghost compact" disabled={loading} type="button" onClick={() => setConfirmAction("remover")}>
              REMOVER
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <article className={`objetivo-card status-${objetivo.status}`}>
      <div className="objetivo-card-head">
        <div>
          <span className={`meta-tag status-tag ${objetivo.status}`}>{statusLabels[objetivo.status] || objetivo.status}</span>
          <h3>{objetivo.titulo}</h3>
        </div>
        {active ? (
          <button className="button fire compact" type="button" onClick={() => setManageOpen(true)}>
            GERENCIAR
          </button>
        ) : expanded ? <strong>{objetivo.progresso}%</strong> : (
          <button className="button secondary compact" type="button" onClick={() => setDetailsOpen(true)}>
            DETALHES
          </button>
        )}
      </div>

      {active && (
        <>
          <div className="objetivo-meta compact">
            <span className={pastTarget ? "target-date past" : "target-date"}>
              {targetLabel ? `Alvo: ${targetLabel}` : "Sem prazo definido"}
            </span>
          </div>
          <div className="progress-track" aria-label={`Progresso ${objetivo.progresso}%`}>
            <span style={{ width: `${objetivo.progresso}%` }} />
          </div>
          <strong className="objective-progress-number">{objetivo.progresso}%</strong>
          {linkedMissions.length > 0 ? (
            <div className="objective-linked-missions compact">
              {linkedMissions.map((mission) => (
                <div className="objective-linked-mission" key={mission.id}>
                  <strong>{mission.titulo || "Sem título"}</strong>
                  <span>{mission.status_label || mission.status_code || "Status indisponível"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted objetivo-empty-orders">Objetivo sem ordens operacionais.</p>
          )}
        </>
      )}

      {expanded && (
        <>
          {objetivo.descricao && <p>{objetivo.descricao}</p>}

          <div className="objetivo-meta">
            <span>{sonho ? `Sonho: ${sonho.titulo}` : "Sem sonho vinculado"}</span>
            <span className={pastTarget ? "target-date past" : "target-date"}>
              {targetLabel ? `Alvo: ${targetLabel}` : "Sem prazo definido"}
            </span>
            {objetivo.status === "concluido" && concludedLabel && <span>Conclusão: {concludedLabel}</span>}
          </div>

          <div className="progress-track" aria-label={`Progresso ${objetivo.progresso}%`}>
            <span style={{ width: `${objetivo.progresso}%` }} />
          </div>

          {linkedMissions.length > 0 ? (
            <div className="objective-linked-missions">
              <p className="section-kicker fire">MISSÕES</p>
              {linkedMissions.map((mission) => (
                <div className="objective-linked-mission" key={mission.id}>
                  <strong>{mission.titulo || "Sem título"}</strong>
                  <span>{mission.status_label || mission.status_code || "Status indisponível"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted objetivo-empty-orders">Objetivo sem ordens operacionais.</p>
          )}

          {renderManagementActions({ includeHide: true })}
        </>
      )}

      {manageOpen && (
        <MountainDialog label="Gerenciar objetivo" onClose={() => setManageOpen(false)}>
          <div className="section-heading compact">
            <div>
              <p className="section-kicker fire">GERENCIAR OBJETIVO</p>
              <h2>{objetivo.titulo}</h2>
            </div>
          </div>
          <div className="objetivo-meta">
            <span>{sonho ? `Sonho: ${sonho.titulo}` : "Sem sonho vinculado"}</span>
            <span className={pastTarget ? "target-date past" : "target-date"}>
              {targetLabel ? `Alvo: ${targetLabel}` : "Sem prazo definido"}
            </span>
          </div>
          {renderManagementActions()}
        </MountainDialog>
      )}

      {editing && (
        <MountainDialog label="Editar objetivo" onClose={() => setEditing(false)}>
          <div className="section-heading compact">
            <div>
              <p className="section-kicker fire">EDITAR OBJETIVO</p>
              <h2>{objetivo.titulo}</h2>
            </div>
          </div>
          <ObjetivoForm
            editingObjetivo={objetivo}
            loading={loading}
            onCancel={() => setEditing(false)}
            onSubmit={submit}
          />
        </MountainDialog>
      )}

      {confirmAction === "concluir" && (
        <ConfirmDialog
          title="Concluir objetivo"
          message={`"${objetivo.titulo}" será marcado como concluído. Isso é uma mudança de estado, não um salvamento de progresso.`}
          confirmLabel="MARCAR COMO CONCLUÍDO"
          variant="success"
          onCancel={() => setConfirmAction(null)}
          onConfirm={async () => {
            setConfirmAction(null);
            await changeStatus("concluido");
          }}
        />
      )}

      {confirmAction === "remover" && (
        <ConfirmDialog
          title="Remover objetivo"
          message={`"${objetivo.titulo}" será removido. As missões vinculadas perdem o vínculo com este objetivo.`}
          confirmLabel="REMOVER"
          variant="danger"
          onCancel={() => setConfirmAction(null)}
          onConfirm={async () => {
            setConfirmAction(null);
            await removeObjetivo();
          }}
        />
      )}
    </article>
  );
}
