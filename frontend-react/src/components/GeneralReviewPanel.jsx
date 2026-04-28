import React from "react";
import { formatDateTime } from "../utils/date.js";

const REVIEW_STATUS = "FALHA_JUSTIFICADA_PENDENTE_REVISAO";

const FAILURE_REASON_LABELS = Object.freeze({
  not_done: "Não fez",
  done_not_marked: "Fez, mas não registrou",
  partially_done: "Fez parcialmente",
  external_blocker: "Imprevisto real",
  other: "Outro motivo",
});

function getFailureReasonLabel(type) {
  return FAILURE_REASON_LABELS[type] || "Outro motivo";
}

export default function GeneralReviewPanel({
  missions,
  loadingMissionId,
  onReview,
}) {
  const reviewMissions = missions.filter(
    (mission) =>
      mission.status_code === REVIEW_STATUS || mission.permissions?.can_review === true
  );

  return (
    <section className="review-panel" aria-label="Falhas aguardando análise do General">
      <div className="review-panel-header">
        <div>
          <p className="section-kicker">Revisão do General</p>
          <h3>Justificativas aguardando decisão</h3>
          <p className="muted review-copy">
            O Soldado já respondeu. Agora o General decide se a justificativa sustenta a falha.
          </p>
        </div>
      </div>

      {!reviewMissions.length && (
        <div className="review-empty-state">
          <p>Sem falhas para revisar.</p>
        </div>
      )}

      <div className="review-list">
        {reviewMissions.map((mission) => (
          <article
            key={`review-${mission.id}`}
            className={`review-card ${mission.is_decided ? "decided-review" : ""}`}
          >
            <div className="review-card-header">
              <div>
                <h4>{mission.titulo}</h4>
                <p className="muted">
                  Prazo: {mission.prazo || "Sem prazo definido"} · Falhou em{" "}
                  {formatDateTime(mission.failed_at)}
                </p>
              </div>
              {mission.is_decided && (
                <span className="status-badge decided">Decisão do General</span>
              )}
            </div>
            <div className="review-reason">
              <span>Ordem</span>
              <p>{mission.instrucao}</p>
            </div>
            <div className="review-reason">
              <span>Tipo da justificativa</span>
              <p>{getFailureReasonLabel(mission.failure_reason_type)}</p>
            </div>
            <div className="review-reason">
              <span>Justificativa registrada</span>
              <p>{mission.failure_reason || "Sem justificativa registrada."}</p>
            </div>
            <div className="actions-row">
              <button
                className="button secondary"
                type="button"
                onClick={() => onReview(mission.id, true)}
                disabled={loadingMissionId === mission.id}
              >
                ✅ Justificado
              </button>
              <button
                className="button danger"
                type="button"
                onClick={() => onReview(mission.id, false)}
                disabled={loadingMissionId === mission.id}
              >
                ❌ Não justificado
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
