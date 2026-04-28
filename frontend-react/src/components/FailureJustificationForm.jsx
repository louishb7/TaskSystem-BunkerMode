import React, { useState } from "react";

export const FAILURE_REASON_OPTIONS = Object.freeze([
  { value: "not_done", label: "Não fiz" },
  { value: "done_not_marked", label: "Fiz, mas esqueci de marcar" },
  { value: "partially_done", label: "Fiz parcialmente" },
  { value: "external_blocker", label: "Imprevisto real" },
  { value: "other", label: "Outro motivo" },
]);

export default function FailureJustificationForm({
  mission,
  loading = false,
  onSubmit,
  submitLabel = "Enviar justificativa",
}) {
  const [reasonType, setReasonType] = useState("not_done");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedReason = reason.trim();

    if (!reasonType) {
      setError("Selecione o tipo da justificativa.");
      return;
    }

    if (!trimmedReason) {
      setError("Explique o motivo da falha antes de seguir.");
      return;
    }

    setError("");
    const result = await onSubmit(mission.id, {
      failure_reason_type: reasonType,
      failure_reason: trimmedReason,
    });

    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <form className="failure-justification-form" onSubmit={handleSubmit}>
      <fieldset disabled={loading}>
        <legend>Tipo da justificativa</legend>
        <div className="failure-reason-options">
          {FAILURE_REASON_OPTIONS.map((option) => (
            <label key={option.value} className="reason-option">
              <input
                type="radio"
                name={`failure-reason-type-${mission.id}`}
                value={option.value}
                checked={reasonType === option.value}
                onChange={(event) => setReasonType(event.target.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        Justificativa
        <textarea
          name={`failure-reason-${mission.id}`}
          rows="3"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Registre o que aconteceu"
          disabled={loading}
        />
      </label>

      {error && <p className="feedback error">{error}</p>}

      <button className="button primary" type="submit" disabled={loading}>
        {loading ? "Enviando..." : submitLabel}
      </button>
    </form>
  );
}
