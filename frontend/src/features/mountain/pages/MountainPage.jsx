import React from "react";

import StatusNotice from "../../../components/ui/StatusNotice.jsx";
import TacticalShell from "../../../components/tactical/TacticalShell.jsx";
import ObjetivoList from "../components/ObjetivoList.jsx";
import SonhoPanel from "../components/SonhoPanel.jsx";
import { useMountain } from "../hooks/useMountain.js";

function missionBelongsToMountain(mission) {
  return Boolean(mission?.objetivo_id || mission?.sonho_id);
}

function calculateAverageProgress(objetivos = []) {
  const activeObjetivos = objetivos.filter((objetivo) => objetivo.status === "ativo");
  if (activeObjetivos.length === 0) {
    return 0;
  }
  const total = activeObjetivos.reduce((sum, objetivo) => sum + Number(objetivo.progresso || 0), 0);
  return Math.round(total / activeObjetivos.length);
}

export default function MountainPage({
  embedded = false,
  onClose,
  onUnauthorized,
  token,
}) {
  const mountain = useMountain({ onUnauthorized, token });
  const busy = mountain.loading || mountain.mutating;
  const sonhosAtivos = mountain.sonhos.filter((sonho) => sonho.status === "ativo");
  const objetivosAtivos = mountain.objetivos.filter((objetivo) => objetivo.status === "ativo");
  const missoesVinculadas = mountain.missions.filter(missionBelongsToMountain);
  const progressoMedio = calculateAverageProgress(mountain.objetivos);

  const content = (
    <section className="mountain-page">
      <div className="mountain-header">
        <div>
          <p className="section-kicker fire">A MONTANHA</p>
          <h1>A Montanha Operacional</h1>
          <p className="muted">Transforme direção em avanço concreto: Sonho, Objetivos e Missões conectados em uma única escalada.</p>
        </div>
        <div className="mountain-stat-grid" aria-label="Indicadores da Montanha">
          <div className="mountain-stat-card">
            <span>Sonhos ativos</span>
            <strong>{sonhosAtivos.length}</strong>
          </div>
          <div className="mountain-stat-card">
            <span>Objetivos ativos</span>
            <strong>{objetivosAtivos.length}</strong>
          </div>
          <div className="mountain-stat-card">
            <span>Missões vinculadas</span>
            <strong>{missoesVinculadas.length}</strong>
          </div>
          <div className="mountain-stat-card">
            <span>Progresso médio</span>
            <strong>{progressoMedio}%</strong>
          </div>
        </div>
        {onClose && (
          <button className="button secondary compact" type="button" onClick={onClose}>
            FECHAR
          </button>
        )}
      </div>

      <StatusNotice status={mountain.status} />

      <SonhoPanel
        loading={busy}
        onArchive={mountain.archiveSonho}
        onCreateObjetivo={mountain.createObjetivo}
        onCreate={mountain.createSonho}
        onCreateMission={mountain.createMission}
        missions={mountain.missions}
        objetivos={mountain.objetivos}
        onDeleteObjetivo={mountain.deleteObjetivo}
        onPromote={mountain.promoteSonho}
        onUpdateObjetivo={mountain.updateObjetivo}
        onUpdateObjetivoProgress={mountain.updateObjetivoProgresso}
        onUpdateObjetivoStatus={mountain.updateObjetivoStatus}
        onUpdate={mountain.updateSonho}
        sonhos={mountain.sonhos}
      />

      <ObjetivoList
        loading={busy}
        missions={mountain.missions}
        objetivos={mountain.objetivos}
        onCreate={mountain.createObjetivo}
        onCreateMission={mountain.createMission}
        onDelete={mountain.deleteObjetivo}
        onUpdate={mountain.updateObjetivo}
        onUpdateProgress={mountain.updateObjetivoProgresso}
        onUpdateStatus={mountain.updateObjetivoStatus}
        sonhos={mountain.sonhosAtivos}
      />
    </section>
  );

  if (embedded) {
    return content;
  }

  return <TacticalShell mode="general">{content}</TacticalShell>;
}
