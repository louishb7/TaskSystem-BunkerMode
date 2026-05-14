import React from "react";

import lionEmblem from "../../assets/bunkermode/emblems/leao-do-dia.png";

export default function LionEmblem({ compact = false, variant }) {
  const resolvedVariant = variant || (compact ? "compact" : "panel");

  return (
    <div className={`lion-emblem ${resolvedVariant}`} aria-hidden="true">
      <span className="lion-emblem-frame">
        <img src={lionEmblem} alt="" />
      </span>
    </div>
  );
}
