import React from "react";

export default function WeeklyReportPanel({ report, loading, onRefresh }) {
  return (
    <section className="panel weekly-report-panel">
      <div className="section-heading general-heading">
        <div>
          <p className="section-kicker">Relatório semanal</p>
          <h2>Revisão baseada em execução real</h2>
          <p className="muted form-lead">
            Este quadro resume o que foi criado, concluído, falhou e ficou pendente na semana.
          </p>
        </div>
        <button className="button secondary compact" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar relatório"}
        </button>
      </div>

      {!report && <p className="muted">Nenhum dado semanal disponível.</p>}

      {report && (
        <>
          <div className="report-metrics">
            <div className="report-metric">
              <span>Taxa de conclusão</span>
              <strong>{report.completion_rate}%</strong>
            </div>
            <div className="report-metric">
              <span>Concluídas / total</span>
              <strong>
                {report.completed_missions} / {report.total_missions}
              </strong>
            </div>
            <div className="report-metric">
              <span>Falhas em compromissos</span>
              <strong>{report.committed_missions_failed}</strong>
            </div>
            <div className="report-metric">
              <span>Aguardando justificativa</span>
              <strong>{report.missions_waiting_justification}</strong>
            </div>
            <div className="report-metric">
              <span>Aguardando revisão</span>
              <strong>{report.missions_waiting_review}</strong>
            </div>
            <div className="report-metric">
              <span>Falhas revisadas</span>
              <strong>{report.reviewed_failures}</strong>
            </div>
          </div>

          <div className="report-reasons">
            <span>Razões de falha da semana</span>
            {report.failure_reasons?.length ? (
              <ul>
                {report.failure_reasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>{reason}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nenhuma justificativa registrada neste intervalo.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
