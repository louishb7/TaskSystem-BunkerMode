import React from "react"

import StatusNotice from "../../../components/ui/StatusNotice"
import TacticalShell from "../../../components/tactical/TacticalShell"
import SonhoPanel from "../components/SonhoPanel"
import { useMountain } from "../hooks/useMountain"

export default function MountainPage({ embedded = false, onClose, onUnauthorized, token }) {
  const mountain = useMountain({ onUnauthorized, token })
  const busy = mountain.loading || mountain.mutating

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
        onCreate={mountain.createSonho}
        onCreateMission={mountain.createMission}
        missions={mountain.missions}
        onPromote={mountain.promoteSonho}
        onUpdate={mountain.updateSonho}
        sonhos={mountain.sonhos}
      />
    </section>
  )

  if (embedded) {
    return content
  }

  return <TacticalShell mode="general">{content}</TacticalShell>
}
