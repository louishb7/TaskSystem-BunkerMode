import React from "react";

export default function TacticalShell({ children, mode = "general" }) {
  return <main className={`tactical-shell ${mode}`}>{children}</main>;
}
