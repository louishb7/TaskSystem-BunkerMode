import React from "react";

import EmptyState from "../../../components/ui/EmptyState.jsx";
import MissionCard from "../../missions/components/MissionCard.jsx";

export default function OrdersPanel({
  decisionLoadingId,
  loading,
  onCreateOrder,
  onDeleteMission,
  onEditMission,
  onToggleDecision,
  selectedMissions,
}) {
  return (
    <section className="panel orders-panel">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">ORDENS DO DIA</p>
          <h2>Plano da caça</h2>
          <p className="muted">
            {selectedMissions.length === 1
              ? "1 ordem definida para o dia selecionado."
              : `${selectedMissions.length} ordens definidas para o dia selecionado.`}
          </p>
        </div>
        <button className="button fire create-order" type="button" onClick={onCreateOrder}>
          CRIAR NOVA ORDEM
        </button>
      </div>

      {loading ? (
        <EmptyState
          title="Sincronizando comando"
          message="Carregando ordens do dia selecionado."
        />
      ) : selectedMissions.length > 0 ? (
        <div className="mission-list">
          {selectedMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onDelete={() => onDeleteMission(mission)}
              onEdit={() => onEditMission(mission)}
              onToggleDecision={() => onToggleDecision(mission)}
              toggling={decisionLoadingId === mission.id}
              variant="general"
            />
          ))}
        </div>
      ) : (
        <div className="empty-state action-empty">
          <h3>Dia sem ordens</h3>
          <p>Nenhuma ordem foi definida para o dia selecionado.</p>
          <button className="button fire compact" type="button" onClick={onCreateOrder}>
            CRIAR NOVA ORDEM
          </button>
        </div>
      )}
    </section>
  );
}
