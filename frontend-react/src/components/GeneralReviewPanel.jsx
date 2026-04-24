import React from "react";
import { formatDateTime } from "../utils/date.js";

export default function GeneralReviewPanel({
  missions,
  loadingMissionId,
  onReview,
}) {
  if (!missions.length) {
    return null;
  }

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

      <div className="review-list">
        {missions.map((mission) => (
          <article key={`review-${mission.id}`} className="review-card">
            <div className="review-card-header">
              <div>
                <h4>{mission.titulo}</h4>
                <p className="muted">
                  Prazo: {mission.prazo || "Sem prazo definido"} · Falhou em{" "}
                  {formatDateTime(mission.failed_at)}
                </p>
              </div>
            </div>
            <div className="review-reason">
              <span>Justificativa registrada</span>
              <p>{mission.failure_reason}</p>
            </div>
            <div className="actions-row">
              <button
                className="button secondary"
                type="button"
                onClick={() => onReview(mission.id, true)}
                disabled={loadingMissionId === mission.id}
              >
                Justifica.
              </button>
              <button
                className="button danger"
                type="button"
                onClick={() => onReview(mission.id, false)}
                disabled={loadingMissionId === mission.id}
              >
                Explica, mas não justifica.
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
