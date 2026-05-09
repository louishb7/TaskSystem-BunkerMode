import React from "react";

import { formatDateTime } from "../../../utils/date.js";
import { STATUS_MISSAO, isCompleted } from "../../../utils/missionStatus.js";

const FAILURE_REASON_LABELS = Object.freeze({
  not_done: "Não fez",
  done_not_marked: "Fez, mas não registrou",
  partially_done: "Fez parcialmente",
  external_blocker: "Imprevisto real",
  other: "Outro motivo",
});

function getFailureReasonLabel(type) {
  return FAILURE_REASON_LABELS[type] || "Tipo não informado";
}

function isFailureMission(mission) {
  return String(mission?.status_code || "").startsWith("FALHA");
}

function isPendingMission(mission) {
  return mission?.status_code === STATUS_MISSAO.PENDENTE;
}

export default function GeneralReviewPanel({
  allMissions = [],
  loadingMissionId,
  missions,
  onReview,
}) {
  const sourceMissions = allMissions.length ? allMissions : missions;
  const total = sourceMissions.length;
  const completed = sourceMissions.filter(isCompleted).length;
  const pending = sourceMissions.filter(isPendingMission).length;
  const decided = sourceMissions.filter((mission) => mission?.is_decided === true).length;
  const failures = sourceMissions.filter(isFailureMission);
  const decidedFailures = failures.filter((mission) => mission?.is_decided === true);
  const reviewMissionIds = new Set(missions.map((mission) => mission.id));
  const failuresForList = failures.length ? failures : missions;
  const huntRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section className="panel review-panel" aria-label="Falhas aguardando decisão do General">
      <div className="review-summary">
        <div>
          <p className="section-kicker fire">RELATÓRIO</p>
          <h2>Leitura da execução</h2>
          <p className="muted">
            Dados reais do quadro atual, histórico carregado e falhas aguardando decisão.
          </p>
        </div>
        <strong>{huntRate}%</strong>
      </div>

      <div className="review-metrics">
        <div>
          <span>ORDENS</span>
          <strong>{total}</strong>
        </div>
        <div>
          <span>EXECUTADAS</span>
          <strong>{completed}</strong>
        </div>
        <div>
          <span>PENDENTES</span>
          <strong>{pending}</strong>
        </div>
        <div>
          <span>DECIDIDAS</span>
          <strong>{decided}</strong>
        </div>
        <div className="review-metric-decision">
          <span>DECIDIDAS FALHADAS</span>
          <strong>{decidedFailures.length}</strong>
        </div>
      </div>

      {failures.length > 0 ? (
        <div className="review-behavior">
          <span>LEITURA DO COMPORTAMENTO</span>
          <p>
            {decidedFailures.length > 0
              ? "Há falhas em ordens inegociáveis. Revise justificativa e padrão de execução."
              : "Nenhuma ordem decidida falhou nos dados carregados."}
          </p>
        </div>
      ) : (
        <div className="empty-state flat">
          <h3>Sem falhas registradas</h3>
          <p>O relatório não encontrou falhas no conjunto carregado.</p>
        </div>
      )}

      <p className="section-kicker danger">RELATÓRIO DE FALHAS</p>
      {failuresForList.length > 0 ? (
        <div className="review-list">
          {failuresForList.map((mission) => {
            const failedAt = mission?.failed_at
              ? `Falhou em ${formatDateTime(mission.failed_at)}`
              : "";
            const requiresDecision = mission?.is_decided === true && reviewMissionIds.has(mission.id);

            return (
              <article key={mission.id} className="review-card">
                <p className={`section-kicker ${requiresDecision ? "danger" : "fire"}`}>
                  {requiresDecision ? "REVISÃO OBRIGATÓRIA" : "REGISTRO INFORMATIVO"}
                </p>
                <h3>{mission.titulo || "Sem título"}</h3>
                <p className="muted">
                  Prazo: {mission.prazo || "Sem prazo"}{failedAt ? ` / ${failedAt}` : ""}
                </p>

                <div className="review-reason">
                  <span>JUSTIFICATIVA DO SOLDADO</span>
                  <strong>{getFailureReasonLabel(mission.failure_reason_type)}</strong>
                  <p>{mission.failure_reason || "Justificativa não registrada."}</p>
                </div>

                {requiresDecision ? (
                  <div className="actions-row">
                    <button
                      className="button secondary"
                      disabled={loadingMissionId === mission.id}
                      type="button"
                      onClick={() => onReview(mission.id, true)}
                    >
                      {loadingMissionId === mission.id ? "AGUARDE" : "ACEITAR"}
                    </button>
                    <button
                      className="button danger"
                      disabled={loadingMissionId === mission.id}
                      type="button"
                      onClick={() => onReview(mission.id, false)}
                    >
                      {loadingMissionId === mission.id ? "AGUARDE" : "REJEITAR"}
                    </button>
                  </div>
                ) : (
                  <p className="review-info-note">
                    Falha normal registrada para leitura. Não exige decisão do General.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state flat">
          <h3>Sem relatório pendente</h3>
          <p>Nenhuma falha decidida aguarda decisão do General.</p>
        </div>
      )}
    </section>
  );
}
