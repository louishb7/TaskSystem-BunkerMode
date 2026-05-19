import React from "react";

import { formatCurrentDay } from "../../calendar/calendarUtils.js";

export default function ActivateSoldierDialog({
  loading,
  onCancel,
  onConfirm,
  todayMissions = [],
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true">
        <p className="section-kicker fire">LEÃO DO DIA</p>
        <h2>{formatCurrentDay()}</h2>
        {todayMissions.length > 0 ? (
          <ul className="protocol-brief">
            {todayMissions.map((mission) => (
              <li key={mission.id}>{mission?.titulo || "Missão sem título"}</li>
            ))}
          </ul>
        ) : (
          <div className="protocol-brief">
            <span>Nenhuma missão definida para hoje</span>
          </div>
        )}
        <div className="actions-row">
          <button className="button secondary" type="button" onClick={onCancel}>
            CANCELAR
          </button>
          <button className="button fire" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "ATIVANDO" : "SAIR PARA A CAÇA"}
          </button>
        </div>
      </section>
    </div>
  );
}
