import React, { useMemo, useState } from "react";

import archiveAsset from "../../../assets/bunkermode/archive/arquivo-missoes.png";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import { formatDateTime, parseApiDate } from "../../../utils/date.js";
import { STATUS_MISSAO, isCompleted, isDoneNotMarked } from "../../../utils/missionStatus.js";
import { getWeekDays, normalizeMissionDate } from "../../calendar/calendarUtils.js";

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
  return String(mission?.status_code || "").startsWith("FALHA")
    && !isDoneNotMarked(mission);
}

function isVisibleFailureRecord(mission) {
  return [
    STATUS_MISSAO.FALHA_PENDENTE_JUSTIFICATIVA,
    STATUS_MISSAO.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
    STATUS_MISSAO.FALHA_REVISADA,
  ].includes(mission?.status_code) && !isDoneNotMarked(mission);
}

function isPendingMission(mission) {
  return mission?.status_code === STATUS_MISSAO.PENDENTE;
}

function isSameOrAfter(date, start) {
  return date.getTime() >= start.getTime();
}

function isSameOrBefore(date, end) {
  return date.getTime() <= end.getTime();
}

function formatRangeDate(date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function getMissionDate(mission) {
  const normalized = normalizeMissionDate(mission?.prazo);
  return parseApiDate(normalized);
}

function uniqueMissions(missions) {
  const seen = new Set();
  return missions.filter((mission) => {
    if (!mission?.id || seen.has(mission.id)) {
      return false;
    }
    seen.add(mission.id);
    return true;
  });
}

function formatReportDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatOperationalDate(value) {
  if (!value || typeof value !== "string") {
    return "data indisponível";
  }

  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

function formatOperationalPeriod(period) {
  if (!period?.start_date || !period?.end_date) {
    return "Período indisponível";
  }
  return `${formatOperationalDate(period.start_date)} a ${formatOperationalDate(period.end_date)}`;
}

function getReviewPeriodLabel(review) {
  return `${formatOperationalDate(review.start_date)} - ${formatOperationalDate(review.end_date)}`;
}

export default function GeneralReviewPanel({
  allMissions = [],
  loadingMissionId,
  missions,
  onClearFailures,
  onCloseReview,
  onReview,
  reviewState,
  weeklyReviews = [],
}) {
  const [period, setPeriod] = useState("week");
  const [failuresOpen, setFailuresOpen] = useState(false);
  const [weeklyFailuresOpen, setWeeklyFailuresOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewClosing, setReviewClosing] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);
  const range = useMemo(() => {
    if (period === "month") {
      return {
        end: today,
        label: `Mês até ${formatRangeDate(today)}`,
        start: new Date(today.getFullYear(), today.getMonth(), 1),
      };
    }

    const weekDays = getWeekDays(today);
    return {
      end: today,
      label: `${formatRangeDate(weekDays[0])} a ${formatRangeDate(today)}`,
      start: weekDays[0],
    };
  }, [period, today]);
  const sourceMissions = useMemo(() => allMissions.length ? allMissions : missions, [allMissions, missions]);
  const scopedMissions = useMemo(
    () => sourceMissions.filter((mission) => {
      const missionDate = getMissionDate(mission);
      if (!missionDate) {
        return true;
      }
      return isSameOrAfter(missionDate, range.start) && isSameOrBefore(missionDate, range.end);
    }),
    [range, sourceMissions]
  );
  const scopedReviewMissions = useMemo(
    () => missions.filter((mission) => {
      const missionDate = getMissionDate(mission);
      if (!missionDate) {
        return true;
      }
      return isSameOrAfter(missionDate, range.start) && isSameOrBefore(missionDate, range.end);
    }),
    [missions, range]
  );
  const total = scopedMissions.length;
  const completed = scopedMissions.filter(isCompleted).length;
  const pending = scopedMissions.filter(isPendingMission).length;
  const failures = scopedMissions.filter(isFailureMission);
  const reviewMissionIds = new Set(missions.map((mission) => mission.id));
  const visibleFailuresForList = uniqueMissions([...scopedReviewMissions, ...failures])
    .filter(isVisibleFailureRecord);
  const hasClearableFailure = visibleFailuresForList.some(
    (mission) => mission?.failure_reason
  );
  const visiblePendingReviewCount = visibleFailuresForList.filter(
    (mission) => reviewMissionIds.has(mission.id)
  ).length;
  const huntRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = Math.max(0, total - completed);
  const executionReading = (() => {
    if (total === 0) {
      return "Sem ordens no período carregado. O relatório fica limpo até haver execução registrada.";
    }

    if (failures.length > 0) {
      return `${failures.length} falha registrada no período. Use como leitura operacional da execução.`;
    }

    if (remaining > 0) {
      return `${remaining} ordem ainda não foi executada no período. A leitura só fecha quando a caçada terminar.`;
    }

    return "Todas as ordens carregadas para o período foram executadas sem falha registrada.";
  })();

  async function clearFailureReport() {
    if (!hasClearableFailure) {
      return;
    }

    const cleared = await onClearFailures?.({
      start_date: formatReportDate(range.start),
      end_date: formatReportDate(range.end),
    });
    if (cleared) {
      setFailuresOpen(false);
    }
  }

  async function closeWeeklyReview() {
    setReviewClosing(true);
    const closed = await onCloseReview?.({ observacao: reviewNote.trim() || null });
    setReviewClosing(false);
    if (closed) {
      setReviewNote("");
    }
  }

  const weeklyReport = reviewState?.reading?.report || {};
  const weeklyPending = reviewState?.reading?.pending_missions || 0;
  const weeklyTotal = (weeklyReport.total_missions || 0) + weeklyPending;
  const weeklyFailures = Array.isArray(reviewState?.reading?.failures) ? reviewState.reading.failures : [];
  const visibleWeeklyFailures = weeklyFailuresOpen ? weeklyFailures : weeklyFailures.slice(0, 4);
  const selectedReview = weeklyReviews.find((review) => review.id === selectedReviewId);
  const hasWeeklyReview = Boolean(reviewState?.pending);

  return (
    <section className="panel review-panel" aria-label="Leitura da execução do General">
      <div className="review-toolbar">
        <div>
          <p className="section-kicker fire">RELATÓRIO</p>
          <h2>Leitura da execução</h2>
          <p className="muted">{range.label}</p>
        </div>
        <div className="segmented-control review-period-toggle" aria-label="Período do relatório">
          <button className={period === "week" ? "active" : ""} type="button" onClick={() => setPeriod("week")}>
            SEMANA
          </button>
          <button className={period === "month" ? "active" : ""} type="button" onClick={() => setPeriod("month")}>
            MÊS
          </button>
        </div>
      </div>

      {hasWeeklyReview && (
        <div className="weekly-review-panel">
          <div className="review-summary weekly-review-summary">
            <div>
              <p className={`section-kicker ${reviewState?.pending ? "danger" : "fire"}`}>
                {reviewState?.pending ? "REVISÃO DO GENERAL PENDENTE" : "REVISÃO DO GENERAL FECHADA"}
              </p>
              <h3>Semana operacional anterior</h3>
              <p className="muted">{formatOperationalPeriod(reviewState?.period)}</p>
            </div>
            <strong>{weeklyTotal}</strong>
          </div>

          <div className="review-metrics weekly-review-metrics">
            <div>
              <span>EXECUTADAS</span>
              <strong>{weeklyReport.completed_missions || 0}</strong>
            </div>
            <div>
              <span>PENDENTES</span>
              <strong>{weeklyPending}</strong>
            </div>
            <div>
              <span>FALHAS</span>
              <strong>{weeklyReport.failed_missions || 0}</strong>
            </div>
            <div>
              <span>PRIORIDADE ELEVADA</span>
              <strong>{weeklyReport.high_priority_missions || 0}</strong>
            </div>
          </div>

          {reviewState?.pending && (
            <div className="review-close-form">
              <label className="field-label" htmlFor="weekly-review-note">
                Observação do General
              </label>
              <textarea
                id="weekly-review-note"
                maxLength={600}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder="Registro opcional sobre a leitura operacional."
                rows={3}
                value={reviewNote}
              />
              <button
                className="button primary"
                disabled={reviewClosing}
                type="button"
                onClick={closeWeeklyReview}
              >
                {reviewClosing ? "FECHANDO" : "FECHAR REVISÃO"}
              </button>
            </div>
          )}

          <div className="weekly-failure-table">
            <div className="weekly-failure-header">
              <div>
                <p className="section-kicker danger">FALHAS DA SEMANA</p>
                <p className="muted">
                  {weeklyFailures.length > 0
                    ? `${weeklyFailures.length} falha contabilizada na revisão pendente.`
                    : "Nenhuma falha contabilizada na semana."}
                </p>
              </div>
              {weeklyFailures.length > 4 && (
                <button
                  className="button secondary compact"
                  type="button"
                  onClick={() => setWeeklyFailuresOpen((current) => !current)}
                >
                  {weeklyFailuresOpen ? "RECOLHER" : "VER TODAS"}
                </button>
              )}
            </div>
            {visibleWeeklyFailures.length > 0 && (
              <div className="failure-rows">
                {visibleWeeklyFailures.map((mission) => (
                  <div key={mission.id} className={`failure-row ${mission.is_pinned ? "critical" : ""}`}>
                    <span>{mission.is_pinned ? "PRIORIDADE" : "FALHA"}</span>
                    <strong>{mission.titulo || "Sem título"}</strong>
                    <p>{mission.failure_reason || "Justificativa não registrada."}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      <div className="review-content-grid">
        <div className="review-main">
          <div className="review-summary">
            <div>
              <p className="section-kicker fire">CAÇADA</p>
              <h3>Taxa de execução</h3>
              <p className="muted">{executionReading}</p>
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
              <span>FALHAS</span>
              <strong>{failures.length}</strong>
            </div>
          </div>

          {total === 0 && (
            <div className="empty-state flat">
              <h3>Sem dados no período</h3>
              <p>Quando houver ordens executadas ou falhadas, a leitura aparece aqui.</p>
            </div>
          )}
        </div>

        <div className="review-failure-panel">
          <p className="section-kicker danger">FALHAS EM REVISÃO</p>
          <strong>{visiblePendingReviewCount}</strong>
          <p className="muted">
            {visibleFailuresForList.length > 0
              ? `${visibleFailuresForList.length} registro no relatório de falhas.`
              : "Relatório de falhas limpo para este período."}
          </p>
          <div className="actions-row">
            <button
              className="button secondary compact"
              type="button"
              onClick={() => setFailuresOpen((current) => !current)}
            >
              {failuresOpen ? "FECHAR" : "ABRIR"}
            </button>
            <button
              className="button danger ghost compact"
              disabled={!hasClearableFailure}
              type="button"
              onClick={() => setClearConfirmOpen(true)}
            >
              LIMPAR
            </button>
          </div>

          {failuresOpen && (
            visibleFailuresForList.length > 0 ? (
              <div className="review-list compact">
                {visibleFailuresForList.map((mission) => {
                  const failedAt = mission?.failed_at
                    ? `Falhou em ${formatDateTime(mission.failed_at)}`
                    : "";
                  const requiresReview = reviewMissionIds.has(mission.id);

                  return (
                    <article key={mission.id} className="review-card">
                      <p className={`section-kicker ${requiresReview ? "danger" : "fire"}`}>
                        {requiresReview ? "REVISÃO OBRIGATÓRIA" : "REGISTRO INFORMATIVO"}
                      </p>
                      <h3>{mission.titulo || "Sem título"}</h3>
                      <p className="muted">
                        Prazo: {mission.prazo || "Sem prazo"}{failedAt ? ` / ${failedAt}` : ""}
                      </p>

                      <div className="review-reason">
                        <span>JUSTIFICATIVA DA EXECUÇÃO</span>
                        <strong>{getFailureReasonLabel(mission.failure_reason_type)}</strong>
                        <p>{mission.failure_reason || "Justificativa não registrada."}</p>
                      </div>

                      {requiresReview ? (
                        <div className="actions-row">
                          <button
                            className="button secondary compact"
                            disabled={loadingMissionId === mission.id}
                            type="button"
                            onClick={() => onReview(mission.id, true)}
                          >
                            {loadingMissionId === mission.id ? "AGUARDE" : "JUSTIFICATIVA VÁLIDA"}
                          </button>
                          <button
                            className="button danger compact"
                            disabled={loadingMissionId === mission.id}
                            type="button"
                            onClick={() => onReview(mission.id, false)}
                          >
                            {loadingMissionId === mission.id ? "AGUARDE" : "INSUFICIENTE"}
                          </button>
                        </div>
                      ) : (
                        <p className="review-info-note">
                          Falha registrada para leitura operacional.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state flat">
                <h3>Sem relatório pendente</h3>
                <p>Nenhuma falha está visível neste período.</p>
              </div>
            )
          )}
        </div>
      </div>

      <div className="weekly-review-history">
        <div className="asset-heading compact">
          <img src={archiveAsset} alt="" />
          <div>
            <p className="section-kicker fire">ARQUIVO OPERACIONAL</p>
            <h3>Semanas registradas</h3>
          </div>
        </div>
        {weeklyReviews.length > 0 ? (
          <>
            <div className="review-week-grid" aria-label="Semanas revisadas">
              {weeklyReviews.map((review) => (
                <button
                  key={review.id}
                  className={selectedReviewId === review.id ? "selected" : ""}
                  type="button"
                  onClick={() => setSelectedReviewId((current) => (current === review.id ? null : review.id))}
                >
                  <span>SEMANA</span>
                  <strong>{getReviewPeriodLabel(review)}</strong>
                  <small>{formatOperationalDate(review.reviewed_at)}</small>
                </button>
              ))}
            </div>
            {selectedReview ? (
              <article className="selected-review-card">
                <p className="section-kicker fire">REVISÃO ARQUIVADA</p>
                <h3>{getReviewPeriodLabel(selectedReview)}</h3>
                <p className="muted">Fechada em {formatDateTime(selectedReview.reviewed_at)}.</p>
                <div className="review-metrics archived-review-metrics">
                  <div>
                    <span>EXECUTADAS</span>
                    <strong>{selectedReview.completed_missions}</strong>
                  </div>
                  <div>
                    <span>PENDENTES</span>
                    <strong>{selectedReview.pending_missions}</strong>
                  </div>
                  <div>
                    <span>FALHAS</span>
                    <strong>{selectedReview.failed_missions}</strong>
                  </div>
                  <div>
                    <span>PRIORIDADE ELEVADA</span>
                    <strong>{selectedReview.high_priority_missions}</strong>
                  </div>
                </div>
                <p>{selectedReview.resumo_operacional}</p>
                {selectedReview.observacao && <p className="review-info-note">{selectedReview.observacao}</p>}
              </article>
            ) : (
              <div className="empty-state flat">
                <h3>Selecione uma semana</h3>
                <p>O registro operacional aparece aqui apenas quando uma semana arquivada é escolhida.</p>
              </div>
            )}
          </>
        ) : (
          <p className="muted">Nenhuma revisão semanal foi fechada ainda.</p>
        )}
      </div>
      {clearConfirmOpen && (
        <ConfirmDialog
          title="Limpar relatório de falhas"
          message="Os registros informativos deste período serão removidos."
          confirmLabel="LIMPAR"
          variant="danger"
          onCancel={() => setClearConfirmOpen(false)}
          onConfirm={() => {
            clearFailureReport();
            setClearConfirmOpen(false);
          }}
        />
      )}
    </section>
  );
}
