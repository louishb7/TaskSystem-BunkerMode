import React, { useMemo, useState } from "react";

import { formatDateTime, parseApiDate } from "../../../utils/date.js";
import { STATUS_MISSAO, isCompleted } from "../../../utils/missionStatus.js";
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
  return String(mission?.status_code || "").startsWith("FALHA");
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

export default function GeneralReviewPanel({
  allMissions = [],
  loadingMissionId,
  missions,
  onReview,
}) {
  const [period, setPeriod] = useState("week");
  const [failuresOpen, setFailuresOpen] = useState(false);
  const [hiddenFailureIds, setHiddenFailureIds] = useState(() => new Set());
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
  const decided = scopedMissions.filter((mission) => mission?.is_decided === true).length;
  const failures = scopedMissions.filter(isFailureMission);
  const decidedFailures = failures.filter((mission) => mission?.is_decided === true);
  const reviewMissionIds = new Set(missions.map((mission) => mission.id));
  const failuresForList = uniqueMissions([...scopedReviewMissions, ...failures]);
  const visibleFailuresForList = failuresForList.filter((mission) => !hiddenFailureIds.has(mission.id));
  const visiblePendingDecisionCount = visibleFailuresForList.filter(
    (mission) => mission?.is_decided === true && reviewMissionIds.has(mission.id)
  ).length;
  const huntRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = Math.max(0, total - completed);
  const executionReading = (() => {
    if (total === 0) {
      return "Sem ordens no período carregado. O relatório fica limpo até haver execução registrada.";
    }

    if (decidedFailures.length > 0) {
      return `${decidedFailures.length} ordem decidida falhou no período. Priorize a decisão do General antes de avançar.`;
    }

    if (failures.length > 0) {
      return `${failures.length} falha registrada no período. Use como leitura operacional; falhas normais não exigem decisão.`;
    }

    if (remaining > 0) {
      return `${remaining} ordem ainda não foi executada no período. A leitura só fecha quando a caçada terminar.`;
    }

    return "Todas as ordens carregadas para o período foram executadas sem falha registrada.";
  })();

  function clearFailureReport() {
    if (!visibleFailuresForList.length) {
      return;
    }

    const confirmed = window.confirm("Limpar a visualização local do relatório de falhas?");
    if (!confirmed) {
      return;
    }

    setHiddenFailureIds((current) => {
      const next = new Set(current);
      visibleFailuresForList.forEach((mission) => next.add(mission.id));
      return next;
    });
    setFailuresOpen(false);
  }

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
              <span>DECIDIDAS</span>
              <strong>{decided}</strong>
            </div>
            <div className="review-metric-decision">
              <span>DECIDIDAS FALHADAS</span>
              <strong>{decidedFailures.length}</strong>
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
          <p className="section-kicker danger">FALHAS AGUARDANDO DECISÃO</p>
          <strong>{visiblePendingDecisionCount}</strong>
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
              disabled={!visibleFailuresForList.length}
              type="button"
              onClick={clearFailureReport}
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
                            className="button secondary compact"
                            disabled={loadingMissionId === mission.id}
                            type="button"
                            onClick={() => onReview(mission.id, true)}
                          >
                            {loadingMissionId === mission.id ? "AGUARDE" : "ACEITAR"}
                          </button>
                          <button
                            className="button danger compact"
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
                <p>Nenhuma falha está visível neste período.</p>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
