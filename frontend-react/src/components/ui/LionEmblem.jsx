import React from "react";

export default function LionEmblem({ compact = false }) {
  return (
    <div className={`lion-emblem ${compact ? "compact" : ""}`} aria-hidden="true">
      <span className="lion-emblem-ring" />
      <span className="lion-emblem-helmet" />
      <span className="lion-emblem-core">
        <span className="lion-emblem-brow" />
        <span className="lion-emblem-eye left" />
        <span className="lion-emblem-eye right" />
        <span className="lion-emblem-mark" />
        <span className="lion-emblem-jaw" />
      </span>
    </div>
  );
}
