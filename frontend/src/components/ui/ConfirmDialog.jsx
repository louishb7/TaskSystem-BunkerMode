import React from "react";

export default function ConfirmDialog({
  cancelLabel = "CANCELAR",
  confirmLabel,
  message,
  onCancel,
  onConfirm,
  title,
  variant = "danger",
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true">
        <p className="section-kicker fire">ATENÇÃO</p>
        <h2>{title}</h2>
        <p className="muted">{message}</p>
        <div className="actions-row">
          <button className="button secondary" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`button ${variant}`} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
