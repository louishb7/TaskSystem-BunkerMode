import React from "react";

export default function ReturnToCommandDialog({
  loading,
  onCancel,
  onContinue,
  onPasswordChange,
  onSubmit,
  password,
  step,
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true">
        {step === "confirm" ? (
          <>
            <p className="section-kicker danger">PROTOCOLO DE SAÍDA</p>
            <h2>Retornar ao comando</h2>
            <p className="muted">
              Você está saindo do modo de execução. Confirme antes de voltar ao Posto de Comando.
            </p>
            <div className="actions-row">
              <button className="button secondary" type="button" onClick={onCancel}>
                CANCELAR
              </button>
              <button className="button danger" type="button" onClick={onContinue}>
                CONTINUAR
              </button>
            </div>
          </>
        ) : (
          <form className="form-stack" onSubmit={onSubmit}>
            <p className="section-kicker danger">SENHA DO GENERAL</p>
            <label>
              Senha
              <input
                autoComplete="current-password"
                name="senha"
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="Senha"
                type="password"
                value={password}
              />
            </label>
            <div className="actions-row">
              <button className="button secondary" type="button" onClick={onCancel}>
                CANCELAR
              </button>
              <button className="button danger" type="submit" disabled={loading}>
                {loading ? "AGUARDE" : "RETORNAR"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
