import { API_CONFIG_ERROR, API_URL } from "./config"

const REQUEST_TIMEOUT_MS = 30000

export type ApiErrorData = {
  detail?: string
  [key: string]: unknown
}

export type ApiResult<T = any> =
  | {
      ok: true
      status: number
      data: T
    }
  | {
      ok: false
      status: number
      data: ApiErrorData
    }

export type RequestOptions = {
  token?: string | null
  method?: string
  body?: unknown
}

async function parseResponse(response: Response): Promise<ApiResult> {
  if (response.status === 204) {
    return { ok: true, status: 204, data: null }
  }

  try {
    const data = await response.json()
    return response.ok
      ? { ok: true, status: response.status, data }
      : { ok: false, status: response.status, data }
  } catch {
    if (response.ok) {
      return { ok: true, status: response.status, data: null }
    }

    return {
      ok: false,
      status: response.status,
      data: { detail: "Resposta inválida ou vazia do servidor." },
    }
  }
}

export function getErrorMessage(result: ApiResult | null | undefined, fallback: string): string {
  if (result?.status === 0) {
    return "Não foi possível conectar à API."
  }
  return result?.data?.detail || fallback
}

export async function request(path: string, { token, method = "GET", body }: RequestOptions = {}): Promise<ApiResult> {
  if (API_CONFIG_ERROR || !API_URL) {
    return {
      ok: false,
      status: 0,
      data: {
        detail:
          API_CONFIG_ERROR ||
          "Configuração da API ausente. Defina a URL pública da API antes de usar o sistema.",
      },
    }
  }

  const headers: Record<string, string> = {}
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  if (body !== undefined) {
    headers["Content-Type"] = "application/json"
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      signal: controller.signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return parseResponse(response)
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return {
        ok: false,
        status: 0,
        data: { detail: "A API demorou demais para responder. Tente novamente." },
      }
    }
    return {
      ok: false,
      status: 0,
      data: { detail: "Não foi possível conectar à API." },
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}
