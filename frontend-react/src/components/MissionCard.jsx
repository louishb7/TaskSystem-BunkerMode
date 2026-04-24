import React from "react";
import { formatDateTime, isMissionOverdue } from "../utils/date.js";

function isDone(mission) {
  return mission.status === "Concluída";
}

function isReviewedFailure(mission) {
  return mission.status === "Falha revisada";
}

function priorityLabel(priority) {
  return {
    1: "Alta",
    2: "Média",
    3: "Baixa",
  }[priority] || priority;
}

function describeHistoryAction(action) {
  return {
    missao_criada: "Missão criada",
    missao_concluida: "Missão concluída",
    missao_falhou: "Missão falhou no prazo",
    missao_atualizada: "Missão atualizada",
    missao_removida: "Missão removida",
    missao_decidida: "Missão marcada como decidida",
    missao_decisao_removida: "Marca de decisão removida",
    justificativa_registrada: "Justificativa registrada",
    justificativa_aceita: "Justificativa aceita",
    justificativa_recusada: "Justificativa recusada",
  }[action] || "Atualização registrada";
}

export default function MissionCard({
  mission,
  onEdit,
  onComplete,
  onDelete,
  onHistory,
  onToggleDecision,
  togglingDecision,
  planningLocked = false,
  canExecute = false,
}) {
  const done = isDone(mission);
  const reviewedFailure = isReviewedFailure(mission);
  const decided = Boolean(mission.is_decided) && !done;
  const failedAwaitingExcuse =
    mission.status === "Falha aguardando justificativa" ||
    ((Boolean(mission.failed_at) || isMissionOverdue(mission.prazo)) &&
      !mission.failure_reason &&
      !done);

  return (
    <article className={`mission-card ${done ? "done" : ""} ${decided ? "decided" : ""}`}>
      <header className="mission-card-header">
        <div className="mission-title-block">
          {mission.displayId ? <span className="mission-id">Ordem {mission.displayId}</span> : null}
          <h3>{mission.titulo}</h3>
        </div>
        <div className="mission-badges">
          {decided && <span className="status-badge decided">Decidido</span>}
          <span className={`status-badge ${done ? "done" : "pending"}`}>
            {mission.status}
          </span>
        </div>
      </header>

      <p className="mission-instruction">{mission.instrucao}</p>

      <div className="mission-meta">
        <span>Prioridade {priorityLabel(mission.prioridade)}</span>
        <span>{mission.prazo || "Sem prazo definido"}</span>
      </div>

      <div className="mission-actions">
        {!done && canExecute && !failedAwaitingExcuse && (
          <button className="button compact primary" type="button" onClick={() => onComplete(mission.id)}>
            Concluir
          </button>
        )}
        {!done && !planningLocked && !reviewedFailure && (
          <button
            className={`button compact ${decided ? "secondary" : "primary"}`}
            type="button"
            onClick={() => onToggleDecision(mission.id)}
            disabled={togglingDecision}
          >
            {togglingDecision
              ? "Atualizando..."
              : decided
                ? "Remover decisão"
                : "Marcar como decidido"}
          </button>
        )}
        {!planningLocked && !reviewedFailure && (
          <button className="button compact secondary" type="button" onClick={() => onEdit(mission)}>
            Editar
          </button>
        )}
        {!reviewedFailure && (
          <button className="button compact secondary" type="button" onClick={() => onHistory(mission.id)}>
            {mission.historyOpen ? "Ocultar histórico" : "Histórico"}
          </button>
        )}
        {!planningLocked && (
          <button className="button compact danger" type="button" onClick={() => onDelete(mission.id)}>
            Apagar
          </button>
        )}
      </div>

      {(mission.historyOpen || mission.historyLoading || mission.historyError) && (
        <section className="history-panel" aria-label={`Histórico da missão ${mission.id}`}>
          <div className="history-panel-header">
            <h4>Histórico da missão</h4>
            {mission.historyOpen && (
              <button
                className="button compact secondary"
                type="button"
                onClick={() => onHistory(mission.id)}
              >
                Fechar
              </button>
            )}
          </div>

          {mission.historyLoading && (
            <p className="history-state">Carregando acontecimentos da missão...</p>
          )}

          {!mission.historyLoading && mission.historyError && (
            <p className="history-state error">{mission.historyError}</p>
          )}

          {!mission.historyLoading && !mission.historyError && !mission.history?.length && (
            <p className="history-state">
              Ainda não houve movimentos registrados nesta missão.
            </p>
          )}

          {!mission.historyLoading && !mission.historyError && Boolean(mission.history?.length) && (
            <ol className="history-timeline">
              {mission.history.map((event) => (
                <li key={`${event.acao}-${event.criado_em}`} className="history-event">
                  <div className="history-event-marker" />
                  <div className="history-event-content">
                    <div className="history-event-header">
                      <strong>{describeHistoryAction(event.acao)}</strong>
                      <span>{formatDateTime(event.criado_em)}</span>
                    </div>
                    <p>{event.detalhes || "Sem detalhes adicionais."}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </article>
  );
}
