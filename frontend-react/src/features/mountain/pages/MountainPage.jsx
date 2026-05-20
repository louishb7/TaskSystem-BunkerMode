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
      <div className="mountain-header">
        <div>
          <p className="section-kicker fire">A MONTANHA</p>
          <h1>Sonho → Objetivos → Missões</h1>
          <p className="muted">Estrutura estratégica para orientar o que entra no quadro de execução.</p>
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
        onCreate={mountain.createSonho}
        onPromote={mountain.promoteSonho}
        onUpdate={mountain.updateSonho}
        sonhos={mountain.sonhos}
      />

      <ObjetivoList
        loading={busy}
        objetivos={mountain.objetivos}
        onCreate={mountain.createObjetivo}
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
