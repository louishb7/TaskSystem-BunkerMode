import React, { useState } from "react";

import BrandSymbol from "../../../components/ui/BrandSymbol.jsx";

export default function AuthScreen({ loading, onLogin, onRegister, status }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    usuario: "",
    email: "",
    invite_code: "",
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
      invite_code: form.invite_code.trim(),
      senha: form.senha,
    });
  }

  return (
    <main className="auth-page">
      <section className="auth-identity">
        <BrandSymbol size="xl" />
        <h1>BUNKERMODE</h1>
        <p className="auth-lion">TODO DIA EXISTE UM LEÃO.</p>
        <p className="auth-support">PLANEJE COMO GENERAL. EXECUTE COMO SOLDADO.</p>
      </section>

      <section className="auth-card panel" aria-label="Autenticação">
        <div className="segmented-control">
          <button
            className={isLogin ? "active" : ""}
            type="button"
            onClick={() => setMode("login")}
          >
            ENTRAR
          </button>
          <button
            className={!isLogin ? "active" : ""}
            type="button"
            onClick={() => setMode("register")}
          >
            CRIAR CONTA
          </button>
        </div>

        <form className="form-stack" onSubmit={submit}>
          <div className="auth-form-heading">
            <p className="section-kicker">ENTRE NO BUNKER</p>
            <h2>{isLogin ? "Acesso ao posto" : "Novo acesso"}</h2>
          </div>

          {!isLogin && (
            <>
              <label>
                Usuário
                <input
                  autoComplete="username"
                  name="usuario"
                  onChange={updateField}
                  placeholder="usuário"
                  value={form.usuario}
                />
              </label>

              <label>
                Código de convite
                <input
                  autoComplete="off"
                  name="invite_code"
                  onChange={updateField}
                  placeholder="código de acesso"
                  value={form.invite_code}
                />
              </label>
            </>
          )}

          <label>
            E-mail
            <input
              autoComplete="email"
              name="email"
              onChange={updateField}
              placeholder="usuario@email.com"
              type="email"
              value={form.email}
            />
          </label>

          <label>
            Senha
            <input
              autoComplete={isLogin ? "current-password" : "new-password"}
              name="senha"
              onChange={updateField}
              placeholder="senha"
              type="password"
              value={form.senha}
            />
          </label>

          {status.message && <p className={`feedback ${status.type}`}>{status.message}</p>}

          <button className="button fire full" disabled={loading} type="submit">
            {loading ? "AGUARDE" : isLogin ? "ENTRAR NO BUNKER" : "CRIAR ACESSO"}
          </button>
        </form>
      </section>
    </main>
  );
}
