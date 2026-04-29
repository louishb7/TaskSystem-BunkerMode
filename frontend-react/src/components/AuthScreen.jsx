import React, { useState } from "react";

export default function AuthScreen({ onLogin, onRegister, status, loading }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    usuario: "",
    email: "",
    senha: "",
  });

  const isLogin = mode === "login";

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function submit(event) {
    event.preventDefault();
    if (isLogin) {
      onLogin({ email: form.email.trim(), senha: form.senha });
      return;
    }

    onRegister({
      usuario: form.usuario.trim(),
      email: form.email.trim(),
      senha: form.senha,
    });
  }

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <div className="auth-brand-mark">
          <p className="eyebrow">BunkerMode</p>
          <span className="auth-status-dot" />
        </div>
        <h1>Disciplina operacional para o que já precisa acontecer.</h1>
        <p>
          Entre no bunker para definir ordens claras, sustentar compromissos e operar
          um plano de execução com prioridade visível.
        </p>
        <div className="auth-principles" aria-label="Princípios do produto">
          <div>
            <span>Clareza</span>
            <strong>ordens objetivas</strong>
          </div>
          <div>
            <span>Foco</span>
            <strong>menos ruído, mais execução</strong>
          </div>
          <div>
            <span>Peso</span>
            <strong>decisões ganham presença</strong>
          </div>
        </div>
      </section>

      <section className="auth-card" aria-label="Autenticação">
        <div className="segmented-control">
          <button
            type="button"
            className={isLogin ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Entrar
          </button>
          <button
            type="button"
            className={!isLogin ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Criar conta
          </button>
        </div>

        <form className="form-stack" onSubmit={submit}>
          <div className="auth-form-heading">
            <h2>{isLogin ? "Entrar" : "Criar conta"}</h2>
            <p className="muted">
              {isLogin
                ? "Acesse o plano atual e retome a execução."
                : "Abra seu acesso para começar a operar as próximas missões."}
            </p>
          </div>

          {!isLogin && (
            <label>
              Usuário
              <input
                name="usuario"
                value={form.usuario}
                onChange={updateField}
                autoComplete="username"
                placeholder="Seu usuário"
              />
            </label>
          )}

          <label>
            E-mail
            <input
              name="email"
              value={form.email}
              onChange={updateField}
              autoComplete="email"
              placeholder="seu@email.com"
            />
          </label>

          <label>
            Senha
            <input
              name="senha"
              type="password"
              value={form.senha}
              onChange={updateField}
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder="Sua senha"
            />
          </label>

          {status.message && (
            <p className={`feedback ${status.type}`}>{status.message}</p>
          )}

          <button className="button primary" type="submit" disabled={loading}>
            {loading ? "Processando..." : isLogin ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </section>
    </main>
  );
}
