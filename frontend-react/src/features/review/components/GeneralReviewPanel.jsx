import React from "react";

import { formatDateTime } from "../../../utils/date.js";

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

export default function GeneralReviewPanel({
  loadingMissionId,
  missions,
  onReview,
}) {
  if (!missions.length) {
    return (
      <section className="panel review-empty">
        <div className="empty-state flat">
          <h3>Sem pós-ação pendente</h3>
          <p>Nenhuma falha aguarda decisão do General.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel review-panel" aria-label="Falhas aguardando decisão do General">
      <p className="section-kicker danger">PÓS-AÇÃO: FALHAS AGUARDANDO DECISÃO</p>
      <div className="review-list">
        {missions.map((mission) => {
          const failedAt = mission?.failed_at
            ? `Falhou em ${formatDateTime(mission.failed_at)}`
            : "";

          return (
            <article key={mission.id} className="review-card">
              <p className="section-kicker danger">REVISÃO</p>
              <h3>{mission.titulo || "Sem título"}</h3>
              <p className="muted">
                Prazo: {mission.prazo || "Sem prazo"}{failedAt ? ` / ${failedAt}` : ""}
              </p>

              <div className="review-reason">
                <span>JUSTIFICATIVA DO SOLDADO</span>
                <strong>{getFailureReasonLabel(mission.failure_reason_type)}</strong>
                <p>{mission.failure_reason || "Justificativa não registrada."}</p>
              </div>

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
            </article>
          );
        })}
      </div>
    </section>
  );
}
