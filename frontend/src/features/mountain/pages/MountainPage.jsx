import React from "react";

import StatusNotice from "../../../components/ui/StatusNotice.jsx";
import TacticalShell from "../../../components/tactical/TacticalShell.jsx";
import ObjetivoList from "../components/ObjetivoList.jsx";
import SonhoPanel from "../components/SonhoPanel.jsx";
import { useMountain } from "../hooks/useMountain.js";

export default function MountainPage({
  embedded = false,
  onClose,
  onUnauthorized,
  token,
}) {
  const mountain = useMountain({ onUnauthorized, token });
  const busy = mountain.loading || mountain.mutating;

  const content = (
    <section className="mountain-page">
      {onClose && (
        <div className="mountain-close-row">
          <button className="button secondary compact" type="button" onClick={onClose}>
            FECHAR
          </button>
        </div>
      )}

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
        onUpdateObjetivoStatus={mountain.updateObjetivoStatus}
        onReorderObjetivos={mountain.reorderObjetivos}
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
        onUpdateStatus={mountain.updateObjetivoStatus}
        onReorder={mountain.reorderObjetivos}
        sonhos={mountain.sonhosAtivos}
      />
    </section>
  );

  if (embedded) {
    return content;
  }

  return <TacticalShell mode="general">{content}</TacticalShell>;
}
