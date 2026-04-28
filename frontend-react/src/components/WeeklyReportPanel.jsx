import React, { useMemo } from "react";

const FAILURE_STATUSES = new Set([
  "FALHA_PENDENTE_JUSTIFICATIVA",
  "FALHA_JUSTIFICADA_PENDENTE_REVISAO",
  "FALHA_REVISADA",
]);

const FAILURE_REASON_LABELS = Object.freeze({
  not_done: "Não fez",
  done_not_marked: "Fez, mas não registrou",
  partially_done: "Fez parcialmente",
  external_blocker: "Imprevisto real",
  other: "Outro motivo",
});

const GENERAL_DECISION_LABELS = Object.freeze({
  accepted: "Justificado",
  rejected: "Não justificado",
});

function getFailureReasonLabel(type) {
  return FAILURE_REASON_LABELS[type] || "Outro motivo";
}

function getGeneralDecisionLabel(verdict) {
  return GENERAL_DECISION_LABELS[verdict] || "Sem revisão";
}

function parseEventDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWithinLastSevenDays(date, now) {
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return date >= sevenDaysAgo && date <= now;
}

function buildWeeklyReview(missions, generatedAt) {
  const now = parseEventDate(generatedAt) || new Date();
  const considered = missions.filter((mission) => {
    const eventDate = parseEventDate(mission.completed_at || mission.failed_at);
    return eventDate ? isWithinLastSevenDays(eventDate, now) : false;
  });

  const completed = considered.filter((mission) => mission.status_code === "CONCLUIDA");
  const failed = considered.filter((mission) => FAILURE_STATUSES.has(mission.status_code));
  const failureTypeCounts = failed.reduce((counts, mission) => {
    const type = mission.failure_reason_type || "other";
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

  return {
    total: considered.length,
    completed,
    failed,
    failureTypeCounts,
    decidedFailures: failed.filter((mission) => mission.is_decided).length,
  };
}

export default function WeeklyReportPanel({ report, loading, onRefresh }) {
  const review = useMemo(
    () => buildWeeklyReview(report?.missions || [], report?.generated_at),
    [report]
  );
  const hasData = review.total > 0;

  return (
    <div className="panel weekly-report-panel">
      <div className="section-heading general-heading">
        <div>
          <p className="section-kicker">Revisão semanal</p>
          <h2>Análise dos últimos 7 dias</h2>
        </div>
        <button className="button secondary compact" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar revisão"}
        </button>
      </div>

      {!hasData ? (
        <p className="weekly-empty-state">Sem dados suficientes para análise semanal.</p>
      ) : (
        <div className="weekly-review-content">
          <section className="weekly-review-section">
            <h3>PADRÕES</h3>
            <div className="weekly-pattern-summary">
              <p>
                <span>Falhas totais</span>
                <strong>{review.failed.length}</strong>
              </p>
              <p>
                <span>Falhas críticas</span>
                <strong>{review.decidedFailures}</strong>
              </p>
            </div>
            <ul>
              {Object.entries(review.failureTypeCounts).map(([type, count]) => (
                <li key={type}>
                  {count}x {getFailureReasonLabel(type)}
                </li>
              ))}
            </ul>
          </section>

          <section className="weekly-review-section">
            <h3>QUEBRA DE FALHAS</h3>
            {review.failed.length ? (
              <div className="weekly-failure-list">
                {review.failed.map((mission) => (
                  <article key={`weekly-failure-${mission.id}`} className="weekly-failure-item">
                    <div>
                      <h4>{mission.titulo}</h4>
                      <p>{mission.is_decided ? "Missão decidida: sim" : "Missão decidida: não"}</p>
                    </div>
                    <p>Tipo de falha: {getFailureReasonLabel(mission.failure_reason_type)}</p>
                    <p>Justificativa: {mission.failure_reason || "Sem justificativa"}</p>
                    <p>Decisão do General: {getGeneralDecisionLabel(mission.general_verdict)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p>Sem falhas no período.</p>
            )}
          </section>

          <section className="weekly-review-section">
            <h3>RESUMO DE EXECUÇÃO</h3>
            <p>Missões totais: {review.total}</p>
            <p>Concluídas: {review.completed.length}</p>
            <p>Falhas: {review.failed.length}</p>
          </section>
        </div>
      )}
    </div>
  );
}
