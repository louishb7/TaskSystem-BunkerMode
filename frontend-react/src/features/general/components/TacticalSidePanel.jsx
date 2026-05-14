import React from "react";

import LionEmblem from "../../../components/ui/LionEmblem.jsx";
import { isCompleted } from "../../../utils/missionStatus.js";
import { MissionProgress } from "../../missions/components/MissionCard.jsx";

export default function TacticalSidePanel({
  selectedDateLabel,
  selectedMissions,
}) {
  const totalCount = selectedMissions.length;
  const completedCount = selectedMissions.filter(isCompleted).length;
  const decidedMissions = selectedMissions.filter((mission) => mission?.is_decided === true);

  return (
    <section className="panel tactical-side-panel" aria-label="Painel tático do Leão do Dia">
      <div className="lion-emblem-card">
        <div className="lion-emblem-copy">
          <p className="section-kicker fire">LEÃO DO DIA</p>
          <h2>{selectedDateLabel}</h2>
          <p>
            {totalCount > 0
              ? "A execução do dia aparece nos dados abaixo."
              : "Nenhuma caça definida para este dia."}
          </p>
        </div>
        <LionEmblem />
      </div>

      <div className="side-block hunt-block">
        <MissionProgress label="CAÇADA" missions={selectedMissions} />
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
      </div>

      <div className="side-block decided-summary">
        <div>
          <span>DECIDIDAS</span>
          <strong>{decidedMissions.length}</strong>
        </div>
        <p>{decidedMissions.length === 1 ? "1 inegociável" : `${decidedMissions.length} inegociáveis`}</p>
      </div>
    </section>
  );
}
