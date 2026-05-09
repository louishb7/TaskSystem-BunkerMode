import React from "react";

import { isCompleted } from "../../../utils/missionStatus.js";
import { MissionProgress } from "../../missions/components/MissionCard.jsx";

function LionEmblem() {
  return (
    <div className="lion-emblem" aria-hidden="true">
      <span className="lion-emblem-ring" />
      <span className="lion-emblem-core">
        <span className="lion-emblem-eye left" />
        <span className="lion-emblem-eye right" />
        <span className="lion-emblem-mark" />
      </span>
    </div>
  );
}

function getCentralMission(missions) {
  const openMissions = missions.filter((mission) => !isCompleted(mission));
  return (
    openMissions.find((mission) => mission?.is_decided === true) ||
    openMissions[0] ||
    missions[0] ||
    null
  );
}

export default function TacticalSidePanel({
  onCreateOrder,
  onOpenReview,
  remainingCount,
  reviewCount,
  selectedDateLabel,
  selectedMissions,
}) {
  const totalCount = selectedMissions.length;
  const completedCount = selectedMissions.filter(isCompleted).length;
  const decidedMissions = selectedMissions.filter((mission) => mission?.is_decided === true);
  const centralMission = getCentralMission(selectedMissions);

  return (
    <section className="panel tactical-side-panel" aria-label="Painel tático do Leão do Dia">
      <div className="lion-emblem-card">
        <div className="lion-emblem-copy">
          <p className="section-kicker fire">LEÃO DO DIA</p>
          <h2>{selectedDateLabel}</h2>
          <p>
            {remainingCount > 0
              ? `${remainingCount} ordens ainda sustentam a caçada.`
              : totalCount > 0
                ? "Caçada concluída para o dia selecionado."
                : "Nenhuma caça definida para este dia."}
          </p>
        </div>
        <LionEmblem />
      </div>

      <div className="side-block hunt-block">
        <MissionProgress label="CAÇADA" missions={selectedMissions} />
      </div>

      <div className="side-block mission-focus-block">
        <span>MISSÃO CENTRAL</span>
        {centralMission ? (
          <>
            <strong>{centralMission.titulo || "Sem título"}</strong>
            <p>{centralMission.instrucao || "Ordem sem instrução registrada."}</p>
          </>
        ) : (
          <>
            <strong>Sem ordem definida</strong>
            <p>Escolha um dia e registre a caça principal.</p>
          </>
        )}
      </div>

      <div className="side-metrics" aria-label="Resumo das ordens do dia">
        <div>
          <span>ORDENS</span>
          <strong>{totalCount}</strong>
        </div>
        <div>
          <span>EXECUTADAS</span>
          <strong>{completedCount}</strong>
        </div>
        <div>
          <span>RESTAM</span>
          <strong>{remainingCount}</strong>
        </div>
      </div>

      <div className="side-block decided-summary">
        <span>DECIDIDAS</span>
        <strong>{decidedMissions.length}</strong>
        <p>
          {decidedMissions.length === 1
            ? "1 ordem inegociável no dia selecionado."
            : `${decidedMissions.length} ordens inegociáveis no dia selecionado.`}
        </p>
      </div>

      <div className="side-actions">
        <button className="button fire full" type="button" onClick={onCreateOrder}>
          REGISTRAR ORDEM
        </button>
        <button className="button secondary full report-shortcut" type="button" onClick={onOpenReview}>
          ABRIR RELATÓRIO
          {reviewCount > 0 && <span className="count-badge">{reviewCount}</span>}
        </button>
      </div>
    </section>
  );
}
