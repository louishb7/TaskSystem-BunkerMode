import React, { useState } from "react"

import Button from "../../../components/ui/Button"
import StatusNotice from "../../../components/ui/StatusNotice"

export default function AuthScreen({ loading, onLogin, onRegister, status }) {
  const [mode, setMode] = useState("login")
  const [form, setForm] = useState({
    usuario: "",
    email: "",
    identificador: "",
    senha: "",
  })

  const isLogin = mode === "login"

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function submit(event) {
    event.preventDefault()

    if (isLogin) {
      onLogin({ email: form.identificador.trim(), senha: form.senha })
      return
    }

    onRegister({
      usuario: form.usuario.trim(),
      email: form.email.trim(),
      senha: form.senha,
    })
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-app px-4 py-8 text-text-primary">
      <section
        className="w-full max-w-[420px] rounded-card border border-border bg-surface p-6 shadow-sm sm:p-8"
        aria-label="Autenticação"
      >
        <h1 className="m-0 text-2xl font-semibold tracking-tight normal-case">BunkerMode</h1>
        <p className="mt-2 mb-6 text-sm text-text-secondary">
          Organize o que importa e execute o próximo passo.
        </p>
        <div className="grid grid-cols-2 rounded-control bg-app p-1" aria-label="Acesso">
          <button
            aria-pressed={isLogin}
            className={`min-h-11 rounded-[6px] px-3 text-sm font-medium ${isLogin ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary"}`}
            type="button"
            onClick={() => setMode("login")}
          >
            Entrar
          </button>
          <button
            aria-pressed={!isLogin}
            className={`min-h-11 rounded-[6px] px-3 text-sm font-medium ${!isLogin ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary"}`}
            type="button"
            onClick={() => setMode("register")}
          >
            Criar conta
          </button>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <div>
            <h2 className="m-0 text-lg font-semibold normal-case">
              {isLogin ? "Entrar" : "Criar conta"}
            </h2>
            <p className="mt-1 mb-0 text-sm text-text-secondary">
              {isLogin ? "Use seus dados para continuar." : "Preencha os dados para começar."}
            </p>
          </div>

          {!isLogin && (
            <label className="grid gap-2 text-sm font-medium normal-case text-text-primary">
              Usuário
              <input
                autoComplete="username"
                className="min-h-11 rounded-control border border-control-border bg-surface px-3 text-text-primary placeholder:text-text-secondary focus-visible:border-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                name="usuario"
                onChange={updateField}
                placeholder="Seu usuário"
                value={form.usuario}
              />
            </label>
          )}

          {isLogin ? (
            <label className="grid gap-2 text-sm font-medium normal-case text-text-primary">
              E-mail ou usuário
              <input
                autoComplete="username"
                className="min-h-11 rounded-control border border-control-border bg-surface px-3 text-text-primary placeholder:text-text-secondary focus-visible:border-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                name="identificador"
                onChange={updateField}
                placeholder="nome@exemplo.com"
                type="text"
                value={form.identificador}
              />
            </label>
          ) : (
            <label className="grid gap-2 text-sm font-medium normal-case text-text-primary">
              E-mail
              <input
                autoComplete="email"
                className="min-h-11 rounded-control border border-control-border bg-surface px-3 text-text-primary placeholder:text-text-secondary focus-visible:border-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                name="email"
                onChange={updateField}
                placeholder="usuario@email.com"
                type="email"
                value={form.email}
              />
            </label>
          )}

          <label className="grid gap-2 text-sm font-medium normal-case text-text-primary">
            Senha
            <input
              autoComplete={isLogin ? "current-password" : "new-password"}
              className="min-h-11 rounded-control border border-control-border bg-surface px-3 text-text-primary placeholder:text-text-secondary focus-visible:border-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              name="senha"
              onChange={updateField}
              placeholder="senha"
              type="password"
              value={form.senha}
            />
          </label>

          <StatusNotice status={status} />

          <Button className="w-full" loading={loading} type="submit">
            {isLogin ? "Entrar" : "Criar conta"}
          </Button>
        </form>
      </section>
    </main>
  )
}
