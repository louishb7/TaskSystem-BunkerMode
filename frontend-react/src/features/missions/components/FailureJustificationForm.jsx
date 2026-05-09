import React, { useState } from "react";

export const FAILURE_REASON_OPTIONS = Object.freeze([
  { value: "not_done", label: "NÃO FIZ" },
  { value: "done_not_marked", label: "FIZ, NÃO REGISTREI" },
  { value: "partially_done", label: "FIZ PARCIAL" },
  { value: "external_blocker", label: "IMPEDIMENTO REAL" },
  { value: "other", label: "OUTRO" },
]);

export default function FailureJustificationForm({
  loading = false,
  mission,
  onSubmit,
  submitLabel = "REGISTRAR JUSTIFICATIVA",
}) {
  const [reasonType, setReasonType] = useState("not_done");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setError("Registre o motivo da falha.");
      return;
    }

    setError("");
    const result = await onSubmit(mission.id, {
      failure_reason_type: reasonType,
      failure_reason: trimmedReason,
    });

    if (result?.error) {
      setError(result.error);
      return;
    }

    setReason("");
  }

  return (
    <form className="failure-justification-form" onSubmit={handleSubmit}>
      <fieldset disabled={loading}>
        <legend>JUSTIFICATIVA OBRIGATÓRIA</legend>
        <div className="failure-reason-options">
          {FAILURE_REASON_OPTIONS.map((option) => (
            <label key={option.value} className="reason-option">
              <input
                checked={reasonType === option.value}
                name={`failure-reason-type-${mission.id}`}
                onChange={(event) => setReasonType(event.target.value)}
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        Motivo
        <textarea
          disabled={loading}
          name={`failure-reason-${mission.id}`}
          onChange={(event) => setReason(event.target.value)}
          placeholder="REGISTRE O MOTIVO"
          rows="4"
          value={reason}
        />
      </label>

      {error && <p className="feedback error">{error}</p>}

      <button className="button danger" disabled={loading || !reason.trim()} type="submit">
        {loading ? "AGUARDE" : submitLabel}
      </button>
    </form>
  );
}
