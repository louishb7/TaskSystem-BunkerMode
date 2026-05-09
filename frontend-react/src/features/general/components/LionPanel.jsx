import React from "react";

import { MissionProgress } from "../../missions/components/MissionCard.jsx";

export default function LionPanel({
  remainingCount,
  selectedDateLabel,
  selectedMissions,
}) {
  return (
    <article className="panel lion-panel">
      <div className="lion-top">
        <span className="lion-signal" />
        <div>
          <p className="section-kicker danger">LEÃO DO DIA</p>
          <h2>{selectedDateLabel}</h2>
        </div>
        <div className="lion-counter">
          <strong>{remainingCount}</strong>
          <span>RESTAM</span>
        </div>
      </div>
      <p className="muted">
        {selectedMissions.length === 1
          ? "1 ordem para matar o leão do dia."
          : `${selectedMissions.length} ordens para matar o leão do dia.`}
      </p>
      <MissionProgress label="CAÇADA" missions={selectedMissions} />
    </article>
  );
}
