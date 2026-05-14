import React from "react";

import dualitySymbol from "../../assets/bunkermode/brand/brand-general-soldado-original.png";

export default function BrandSymbol({ muted = false, size = "md" }) {
  return (
    <span className={`brand-symbol ${muted ? "muted" : ""} ${size}`}>
      <img src={dualitySymbol} alt="Símbolo General e Soldado" />
    </span>
  );
}
