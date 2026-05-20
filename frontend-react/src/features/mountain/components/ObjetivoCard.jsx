import React, { useEffect, useMemo, useState } from "react";

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
  objetivo,
  onDelete,
  onUpdate,
  onUpdateProgress,
  onUpdateStatus,
  sonhos,
}) {
  const [editing, setEditing] = useState(false);
  const [progressDraft, setProgressDraft] = useState(Number(objetivo.progresso ?? 0));
  const sonho = useMemo(
    () => sonhos.find((item) => item.id === objetivo.sonho_id),
    [objetivo.sonho_id, sonhos]
  );
  const targetLabel = formatTargetDate(objetivo.data_alvo);
  const pastTarget = isPastDate(objetivo.data_alvo) && objetivo.status === "ativo";
  const progressChanged = progressDraft !== Number(objetivo.progresso ?? 0);

  useEffect(() => {
    setProgressDraft(Number(objetivo.progresso ?? 0));
  }, [objetivo.progresso]);

  async function submit(payload) {
    const saved = await onUpdate?.(objetivo.id, payload);
    if (saved) {
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <article className="objetivo-card editing">
        <ObjetivoForm
          editingObjetivo={objetivo}
          loading={loading}
          onCancel={() => setEditing(false)}
          onSubmit={submit}
          sonhos={sonhos}
        />
      </article>
    );
  }

  return (
    <article className={`objetivo-card status-${objetivo.status}`}>
      <div className="objetivo-card-head">
        <div>
          <span className={`meta-tag status-tag ${objetivo.status}`}>{statusLabels[objetivo.status] || objetivo.status}</span>
          <h3>{objetivo.titulo}</h3>
        </div>
        <strong>{objetivo.progresso}%</strong>
      </div>

      {objetivo.descricao && <p>{objetivo.descricao}</p>}

      <div className="objetivo-meta">
        <span>{sonho ? `Sonho: ${sonho.titulo}` : "Sem sonho vinculado"}</span>
        {targetLabel && <span className={pastTarget ? "target-date past" : "target-date"}>Alvo: {targetLabel}</span>}
      </div>

      <div className="progress-track" aria-label={`Progresso ${objetivo.progresso}%`}>
        <span style={{ width: `${objetivo.progresso}%` }} />
      </div>

      <p className="muted objetivo-empty-orders">Objetivo sem ordens operacionais.</p>

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

      <div className="mountain-card-actions">
        <button
          className="button fire compact"
          disabled={loading || !progressChanged}
          type="button"
          onClick={() => onUpdateProgress?.(objetivo.id, progressDraft)}
        >
          SALVAR PROGRESSO
        </button>
        <button className="button secondary compact" disabled={loading} type="button" onClick={() => setEditing(true)}>
          EDITAR
        </button>
        {objetivo.status !== "concluido" && (
          <button className="button success compact" disabled={loading} type="button" onClick={() => onUpdateStatus?.(objetivo.id, "concluido")}>
            CONCLUIR
          </button>
        )}
        {objetivo.status !== "pausado" && objetivo.status !== "concluido" && (
          <button className="button secondary compact" disabled={loading} type="button" onClick={() => onUpdateStatus?.(objetivo.id, "pausado")}>
            PAUSAR
          </button>
        )}
        {objetivo.status !== "ativo" && objetivo.status !== "concluido" && (
          <button className="button secondary compact" disabled={loading} type="button" onClick={() => onUpdateStatus?.(objetivo.id, "ativo")}>
            REATIVAR
          </button>
        )}
        {objetivo.status !== "abandonado" && objetivo.status !== "concluido" && (
          <button className="button secondary compact" disabled={loading} type="button" onClick={() => onUpdateStatus?.(objetivo.id, "abandonado")}>
            ABANDONAR
          </button>
        )}
        <button className="button danger ghost compact" disabled={loading} type="button" onClick={() => onDelete?.(objetivo.id)}>
          REMOVER
        </button>
      </div>
    </article>
  );
}
