import React, { useState } from "react";

export const FAILURE_REASON_OPTIONS = Object.freeze([
  { value: "not_done", label: "NÃO FIZ" },
  { value: "done_not_marked", label: "FIZ, NÃO REGISTREI" },
  { value: "partially_done", label: "FIZ PARCIAL" },
  { value: "external_blocker", label: "IMPEDIMENTO REAL" },
  { value: "other", label: "OUTRO" },
]);

const FALLBACK_REASON_BY_TYPE = Object.freeze({
  not_done: "Não fiz.",
  done_not_marked: "Fiz fora do aplicativo, mas não registrei no prazo.",
  partially_done: "Fiz parcialmente.",
  external_blocker: "Houve impedimento real.",
  other: "Outro motivo informado pelas opções.",
});

export default function FailureJustificationForm({
  loading = false,
  mission,
  onSubmit,
  required = true,
  submitLabel = "REGISTRAR JUSTIFICATIVA",
}) {
  const [reasonType, setReasonType] = useState("not_done");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedReason = reason.trim();

    if (required && !trimmedReason) {
      setError("Informe o motivo da falha Decidida.");
      return;
    }

    const submittedReason = trimmedReason || FALLBACK_REASON_BY_TYPE[reasonType];

    setError("");
    const result = await onSubmit(mission.id, {
      failure_reason_type: reasonType,
      failure_reason: submittedReason,
    });

    if (result?.error) {
      setError(result.error);
      return;
    }

    setReason("");
    setError("");
  }

  return (
    <form className="failure-justification-form" noValidate onSubmit={handleSubmit}>
      <fieldset disabled={loading}>
        <legend>{required ? "JUSTIFICATIVA OBRIGATÓRIA" : "REGISTRO DA FALHA"}</legend>
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
        {required ? "Motivo obrigatório" : "Motivo opcional"}
        <textarea
          disabled={loading}
          name={`failure-reason-${mission.id}`}
          onChange={(event) => setReason(event.target.value)}
          placeholder={required ? "REGISTRE O MOTIVO DA FALHA" : "REGISTRE O MOTIVO SE NECESSÁRIO"}
          aria-required={required}
          rows="4"
          value={reason}
        />
      </label>

      {error && <p className="feedback error">{error}</p>}

      <button className="button danger" disabled={loading} type="submit">
        {loading ? "AGUARDE" : submitLabel}
      </button>
    </form>
  );
}
