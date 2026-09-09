import React, { useEffect, useRef, useState } from "react"

import { getErrorMessage } from "../../../api/httpClient"
import StatusNotice from "../../../components/ui/StatusNotice"
import { emptyStatus } from "../../../constants/uiState"
import { getEnabledModules, MODULE_CATALOG } from "../../../modules/moduleCatalog"
import { api } from "../../../services/bunkermodeApi"

export default function SettingsPage({ onUnauthorized, onUpdateUser, token, user }) {
  const [updatingKey, setUpdatingKey] = useState(null)
  const [status, setStatus] = useState(emptyStatus)
  const requestId = useRef(0)
  const enabledKeys = new Set(getEnabledModules(user).map((module) => module.key))

  useEffect(() => {
    setUpdatingKey(null)
    return () => {
      requestId.current += 1
    }
  }, [token])

  async function updateModule(moduleKey, enabled) {
    const enabledModules = MODULE_CATALOG.filter((module) =>
      module.key === moduleKey ? enabled : enabledKeys.has(module.key)
    ).map((module) => module.key)

    const currentRequest = requestId.current + 1
    requestId.current = currentRequest
    setUpdatingKey(moduleKey)
    setStatus(emptyStatus)
    const result = await api.updateEnabledModules(token, { enabled_modules: enabledModules })
    if (currentRequest !== requestId.current) {
      return
    }
    setUpdatingKey(null)

    if (onUnauthorized(result)) {
      return
    }
    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível atualizar seus módulos."),
      })
      return
    }

    onUpdateUser(result.data)
    setStatus({ type: "success", message: "Módulos atualizados." })
  }

  return (
    <section className="grid gap-8">
      <header>
        <h1 className="m-0 text-3xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-2 mb-0 text-sm text-text-secondary">
          Escolha as ferramentas que aparecem no seu Bunker.
        </p>
      </header>

      <section className="grid gap-4" aria-labelledby="modules-title">
        <div>
          <h2 className="m-0 text-xl font-semibold" id="modules-title">
            Seus módulos
          </h2>
          <p className="mt-1 mb-0 text-sm text-text-secondary">
            Desativar um módulo o remove da Home e da navegação.
          </p>
        </div>

        <StatusNotice status={status} />

        <div className="grid gap-3">
          {MODULE_CATALOG.map((module) => {
            const enabled = enabledKeys.has(module.key)
            const updating = updatingKey === module.key

            return (
              <label
                key={module.key}
                className="flex min-h-24 cursor-pointer items-center justify-between gap-4 rounded-card border border-border bg-surface p-4 sm:p-5"
              >
                <span>
                  <span className="block font-semibold text-text-primary">{module.label}</span>
                  <span className="mt-1 block text-sm text-text-secondary">
                    {module.description}
                  </span>
                </span>
                <span className="grid shrink-0 justify-items-center gap-1 text-xs text-text-secondary">
                  <input
                    checked={enabled}
                    className="size-5 accent-selection-border"
                    disabled={updatingKey !== null}
                    type="checkbox"
                    onChange={() => updateModule(module.key, !enabled)}
                  />
                  {updating ? "Salvando" : enabled ? "Ativo" : "Inativo"}
                </span>
              </label>
            )
          })}
        </div>
      </section>
    </section>
  )
}
