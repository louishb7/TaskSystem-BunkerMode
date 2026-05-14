import React, { useEffect, useState } from "react";

import missionDecidedAsset from "../../../assets/bunkermode/mission/missao-decidida.png";
import { isCompleted, isDoneNotMarked } from "../../../utils/missionStatus.js";
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
  if (isDoneNotMarked(mission)) {
    return "EXECUTADA FORA DO APLICATIVO";
  }

  const compact = {
    PENDENTE: "PENDENTE",
    CONCLUIDA: "",
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
  onTogglePin,
  onToggleDecision,
  pinning = false,
  toggling = false,
  variant = "general",
}) {
  const [confirmingToggle, setConfirmingToggle] = useState(false);
  const [failureFormOpen, setFailureFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const soldier = variant === "soldier";
  const title = mission?.titulo || "Sem título";
  const instruction = mission?.instrucao || "";
  const isDecided = mission?.is_decided === true;
  const isPinned = mission?.is_pinned === true;
  const disabled = toggling || pinning || completing || justifying;
  const canComplete = can(mission, "can_complete");
  const canJustify = can(mission, "can_justify");
  const requiresJustification = mission?.requires_immediate_justification === true || (canJustify && isDecided);
  const completed = isCompleted(mission);
  const deadlineLabel = formatDeadline(mission?.prazo);
  const operationName = mission?.operacao_nome;
  const failed = String(mission?.status_code || "").startsWith("FALHA");
  const currentStatusText = statusText(mission);

  useEffect(() => {
    setConfirmingToggle(false);
    setFailureFormOpen(false);
    setDetailsOpen(false);
  }, [mission?.id, mission?.is_decided]);

  if (soldier) {
    return (
      <article className={`mission-card soldier-card ${isDecided ? "decided" : ""} ${failed ? "danger" : ""}`}>
        <div className="mission-badge-row">
          {isDecided && <span className="meta-tag critical"><img src={missionDecidedAsset} alt="" />INEGOCIÁVEL</span>}
          {operationName && <span className="meta-tag operation">OPERAÇÃO</span>}
          <span className="meta-tag">{statusText(mission)}</span>
        </div>
        <h3>{title}</h3>
        {operationName && <p className="mission-origin">Operação: {operationName}</p>}
        {instruction && <p className="mission-instruction">{instruction}</p>}

        {canComplete && (
          <button
            className="button fire full"
            disabled={completing}
            type="button"
            onClick={onComplete}
          >
            {completing ? "AGUARDE" : "EXECUTADA"}
          </button>
        )}

        {canJustify && canComplete && !failureFormOpen && (
          <button
            className="soldier-failure-trigger"
            disabled={disabled}
            type="button"
            onClick={() => setFailureFormOpen(true)}
          >
            Registrar falha
          </button>
        )}

        {canJustify && (!canComplete || failureFormOpen) && (
          <div className="soldier-failure-box">
            {canComplete && (
              <p className="soldier-failure-warning">
                A ordem será retirada do quadro do Soldado e registrada como falha no relatório.
              </p>
            )}
            <FailureJustificationForm
              loading={justifying}
              mission={mission}
              onSubmit={onJustify}
              required={requiresJustification}
              submitLabel={requiresJustification ? "REGISTRAR JUSTIFICATIVA" : "REGISTRAR FALHA"}
            />
            {canComplete && (
              <button
                className="button secondary compact"
                disabled={disabled}
                type="button"
                onClick={() => setFailureFormOpen(false)}
              >
                CANCELAR FALHA
              </button>
            )}
          </div>
        )}
      </article>
    );
  }

  return (
    <article className={`mission-card ${isPinned ? "pinned" : ""} ${isDecided ? "decided" : ""} ${completed ? "completed" : ""}`}>
      <div className="mission-compact-head">
        <div className="mission-title-stack">
          <h3>{title}</h3>
          {operationName && <p className="mission-origin">Operação: {operationName}</p>}
        </div>
        <div className="mission-head-actions">
          <button
            className={`priority-icon-button ${isPinned ? "active" : ""}`}
            aria-label={isPinned ? "Prioridade fixada" : "Elevar prioridade"}
            disabled={disabled}
            title={isPinned ? "Prioridade fixada" : "Elevar prioridade"}
            type="button"
            onClick={() => onTogglePin?.(mission)}
          >
            <span aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mission-badge-row mission-context-row">
        {isPinned && <span className="meta-tag pinned">FIXADA</span>}
        {isDecided && <span className="meta-tag critical"><img src={missionDecidedAsset} alt="" />DECIDIDA</span>}
        {operationName && <span className="meta-tag operation">OPERAÇÃO</span>}
        {deadlineLabel !== "HOJE" && <span className="meta-tag">{deadlineLabel}</span>}
      </div>

      {detailsOpen && (
        <div className="mission-details-inline">
          {instruction ? (
            <p className="mission-instruction">{instruction}</p>
          ) : (
            <p className="mission-instruction">Sem instrução adicional.</p>
          )}
          <div className="mission-actions detail-actions">
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
        </div>
      )}

      <div className="mission-actions primary-actions">
        {!completed && currentStatusText && <span className="meta-tag mission-footer-status">{currentStatusText}</span>}
        <button
          className="button secondary compact subtle"
          type="button"
          onClick={() => setDetailsOpen((current) => !current)}
        >
          {detailsOpen ? "OCULTAR" : "DETALHES"}
        </button>
      </div>
    </article>
  );
}

export function MissionProgress({ emptyLabel = "DIA OFF", label = "PROGRESSO", missions }) {
  const total = missions.length;
  const completed = missions.filter(isCompleted).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const complete = total > 0 && completed === total;
  const off = total === 0;

  return (
    <div className={`mission-progress ${complete ? "complete" : ""} ${off ? "off" : ""}`}>
      <div>
        <span>{label}</span>
        <strong>{off ? emptyLabel : `${percent}%`}</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-meta">
        <span>
          {off ? emptyLabel : `${completed}/${total} EXECUTADAS`}
        </span>
      </div>
    </div>
  );
}
