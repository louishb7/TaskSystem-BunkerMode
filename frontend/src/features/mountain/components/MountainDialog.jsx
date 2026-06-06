import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function MountainDialog({ children, label, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  }

  return createPortal(
    <div className="modal-backdrop command-modal-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <div className="command-modal-card mountain-form-modal-card" role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>,
    document.body
  );
}
