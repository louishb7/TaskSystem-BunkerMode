import React from "react"

import BrandSymbol from "../ui/BrandSymbol.jsx"
import TacticalShell from "./TacticalShell.jsx"

export default function BootScreen() {
  return (
    <TacticalShell mode="general">
      <section className="boot-state">
        <BrandSymbol muted size="lg" />
        <p>SINCRONIZANDO COMANDO</p>
      </section>
    </TacticalShell>
  )
}
