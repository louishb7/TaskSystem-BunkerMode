import React from "react";

import generalModeAsset from "../../../assets/bunkermode/modes/modo-general.png";
import LionEmblem from "../../../components/ui/LionEmblem.jsx";
import { MissionProgress } from "../../missions/components/MissionCard.jsx";

export default function TacticalSidePanel({
  loading,
  onActivateSoldier,
  selectedDate,
  selectedDateLabel,
  selectedMissions,
  todayDate,
}) {
  const totalCount = selectedMissions.length;
  const selectedTime = selectedDate?.getTime?.() || 0;
  const todayTime = todayDate?.getTime?.() || 0;
  const isToday = selectedTime === todayTime;
  const progressEmptyLabel = selectedTime > todayTime ? "SEM ORDENS" : isToday ? "0%" : "DIA OFF";
  const showTodayHuntCopy = isToday && totalCount > 0;
  const orderCountText = `${totalCount} ${totalCount === 1 ? "ordem" : "ordens"}`;

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
              ? "O comando organiza. O foco acelera a execução."
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
          <strong className="operational-focus-title">Entrar em foco operacional</strong>
        </div>
        {showTodayHuntCopy && <p className="muted">O leão de hoje espera.</p>}
        <p className="mode-transition-count">
          {isToday
            ? `${orderCountText} para hoje.`
            : `${orderCountText} no dia selecionado — o Soldado executa as de hoje.`}
        </p>
        <button className="button fire full" disabled={loading} type="button" onClick={onActivateSoldier}>
          {loading ? "ATIVANDO" : "ATIVAR MODO SOLDADO"}
        </button>
      </div>
    </section>
  );
}
