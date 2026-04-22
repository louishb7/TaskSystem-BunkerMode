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
        <p className="eyebrow">BunkerMode</p>
        <h1>Missões para execução disciplinada.</h1>
        <p>
          Entre para organizar suas missões, manter foco diário e executar o que foi
          decidido.
        </p>
      </section>

      <section className="auth-card" aria-label="Autenticação">
        <div className="segmented-control">
          <button
            type="button"
            className={isLogin ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={!isLogin ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Cadastro
          </button>
        </div>

        <form className="form-stack" onSubmit={submit}>
          <div>
            <h2>{isLogin ? "Entrar" : "Criar conta"}</h2>
            <p className="muted">
              {isLogin
                ? "Use suas credenciais para acessar suas missões."
                : "Crie um usuário para começar a operar o sistema."}
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
            Email
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
            {loading ? "Processando..." : isLogin ? "Entrar" : "Cadastrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
