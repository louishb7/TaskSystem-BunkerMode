import React from "react";

import generalModeAsset from "../../../assets/bunkermode/modes/modo-general.png";
import LionEmblem from "../../../components/ui/LionEmblem.jsx";
import { MissionProgress } from "../../missions/components/MissionCard.jsx";

export default function TacticalSidePanel({
  loading,
  onActivateSoldier,
  reviewCount,
  selectedDate,
  selectedDateLabel,
  selectedMissions,
  todayDate,
}) {
  const totalCount = selectedMissions.length;
  const selectedTime = selectedDate?.getTime?.() || 0;
  const todayTime = todayDate?.getTime?.() || 0;
  const progressEmptyLabel = selectedTime > todayTime ? "SEM ORDENS" : selectedTime === todayTime ? "0%" : "DIA OFF";

  return (
    <section className="panel tactical-side-panel" aria-label="Painel tático do Leão do Dia">
      <div
        className="lion-emblem-card"
        style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}
      >
        <div className="lion-emblem-copy" style={{ flex: 1 }}>
          <p className="section-kicker fire">LEÃO DO DIA</p>
          <h2>{selectedDateLabel}</h2>
          <p>
            {totalCount > 0
              ? "Após o General decidir, começa a execução."
              : "Nenhuma caça definida para este dia."}
          </p>
        </div>
        <div className="lion-emblem-media" style={{ display: "flex", justifyContent: "center", width: 120 }}>
          <LionEmblem variant="compact" />
        </div>
      </div>

      <div className="side-block hunt-block">
        <MissionProgress emptyLabel={progressEmptyLabel} label="CAÇADA" missions={selectedMissions} />
      </div>

      <div className="side-block hunt-entry">
        <div className="mode-heading compact">
          <img src={generalModeAsset} alt="" />
          <strong>General decide. Soldado executa.</strong>
        </div>
        <p className="muted">
          {reviewCount > 0
            ? "Há revisão pendente. Entre somente se as ordens do dia estiverem fechadas."
            : "Planejamento bloqueia quando a execução começa."}
        </p>
        <p className="mode-transition-count">
          {totalCount === 1 ? "1 ordem no dia selecionado." : `${totalCount} ordens no dia selecionado.`}
        </p>
        <button className="button fire full" disabled={loading} type="button" onClick={onActivateSoldier}>
          {loading ? "ABRINDO" : "INICIAR CAÇADA"}
        </button>
      </div>
    </section>
  );
}
