import React, { useEffect, useState } from "react";

import { isCompleted } from "../../../utils/missionStatus.js";
import FailureJustificationForm from "./FailureJustificationForm.jsx";

function can(mission, key) {
  return Boolean(mission?.permissions?.[key]) && mission?.id !== undefined && mission?.id !== null;
}

function parseMissionDate(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dayRaw, monthRaw, yearRaw] = value.split("-");
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = Number(yearRaw);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [yearRaw, monthRaw, dayRaw] = value.slice(0, 10).split("-");
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = Number(yearRaw);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDeadline(value) {
  const parsed = parseMissionDate(value);
  if (!parsed) {
    return "SEM DATA";
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");

  if (parsed.getTime() === todayStart().getTime()) {
    return "HOJE";
  }

  if (parsed.getTime() < todayStart().getTime()) {
    return "ATRASADA";
  }

  return `${day}/${month}`;
}

function statusText(mission) {
  const compact = {
    PENDENTE: "PENDENTE",
    CONCLUIDA: "EXECUTADA",
    FALHA_PENDENTE_JUSTIFICATIVA: "FALHOU",
    FALHA_JUSTIFICADA_PENDENTE_REVISAO: "FALHOU",
    FALHA_REVISADA: "FALHA REVISADA",
  };

  return compact[mission?.status_code] || mission?.status_label || "PENDENTE";
}

export default function MissionCard({
  completing = false,
  justifying = false,
  mission,
  onComplete,
  onDelete,
  onEdit,
  onJustify,
  onToggleDecision,
  toggling = false,
  variant = "general",
}) {
  const [confirmingToggle, setConfirmingToggle] = useState(false);
  const soldier = variant === "soldier";
  const title = mission?.titulo || "Sem título";
  const instruction = mission?.instrucao || "";
  const isDecided = mission?.is_decided === true;
  const disabled = toggling || completing || justifying;
  const canComplete = can(mission, "can_complete");
  const canJustify = can(mission, "can_justify");

  useEffect(() => {
    setConfirmingToggle(false);
  }, [mission?.id, mission?.is_decided]);

  if (soldier) {
    return (
      <article className={`mission-card soldier-card ${isDecided ? "decided" : ""} ${canJustify ? "danger" : ""}`}>
        <div className="mission-badge-row">
          <span className={`meta-tag ${isDecided ? "critical" : ""}`}>
            {isDecided ? "INEGOCIÁVEL" : "ORDEM"}
          </span>
          <span className="meta-tag">{statusText(mission)}</span>
        </div>
        <h3>{title}</h3>
        {instruction && <p className="mission-instruction">{instruction}</p>}

        {canJustify && (
          <FailureJustificationForm
            loading={justifying}
            mission={mission}
            onSubmit={onJustify}
          />
        )}

        {canComplete && (
          <button
            className="button fire full"
            disabled={completing}
            type="button"
            onClick={onComplete}
          >
            {completing ? "AGUARDE" : "ORDEM EXECUTADA"}
          </button>
        )}
      </article>
    );
  }

  return (
    <article className={`mission-card ${isDecided ? "decided" : ""}`}>
      <div className="mission-badge-row">
        <span className={`meta-tag ${isDecided ? "critical" : ""}`}>
          {isDecided ? "DECIDIDA" : "ORDEM"}
        </span>
        <span className="meta-tag">{formatDeadline(mission?.prazo)}</span>
        <span className="meta-tag">{statusText(mission)}</span>
      </div>

      <h3>{title}</h3>
      {instruction && <p className="mission-instruction">{instruction}</p>}
      {isCompleted(mission) && <span className="done-label">EXECUTADA</span>}

      <div className="mission-actions">
        {can(mission, "can_toggle_decided") && (
          confirmingToggle ? (
            <>
              <button
                className="button danger compact"
                disabled={disabled}
                type="button"
                onClick={() => {
                  setConfirmingToggle(false);
                  onToggleDecision?.(mission);
                }}
              >
                {toggling ? "AGUARDE" : "CONFIRMAR RETIRADA"}
              </button>
              <button
                className="button secondary compact"
                disabled={disabled}
                type="button"
                onClick={() => setConfirmingToggle(false)}
              >
                CANCELAR
              </button>
            </>
          ) : (
            <button
              className={`button compact ${isDecided ? "decision ghost" : "secondary"}`}
              disabled={disabled}
              type="button"
              onClick={() => {
                if (isDecided) {
                  setConfirmingToggle(true);
                  return;
                }
                onToggleDecision?.(mission);
              }}
            >
              {toggling ? "AGUARDE" : isDecided ? "REMOVER DECIDIDA" : "MARCAR DECIDIDA"}
            </button>
          )
        )}

        {can(mission, "can_edit") && (
          <button className="button secondary compact" disabled={disabled} type="button" onClick={onEdit}>
            EDITAR
          </button>
        )}

        {can(mission, "can_delete") && (
          <button className="button secondary compact" disabled={disabled} type="button" onClick={onDelete}>
            REMOVER
          </button>
        )}
      </div>
    </article>
  );
}

export function MissionProgress({ label = "PROGRESSO", missions }) {
  const total = missions.length;
  const completed = missions.filter(isCompleted).length;
  const remaining = Math.max(0, total - completed);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const complete = total > 0 && completed === total;

  return (
    <div className={`mission-progress ${complete ? "complete" : ""}`}>
      <div>
        <span>{label}</span>
        <strong>{percent}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-meta">
        <span>
          {completed}/{total} EXECUTADAS
        </span>
        <span>
          {remaining === 1 ? "1 RESTA" : `${remaining} RESTAM`}
        </span>
      </div>
    </div>
  );
}
