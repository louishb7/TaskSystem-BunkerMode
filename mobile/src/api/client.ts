import { clearStoredToken, getStoredToken } from "@/auth/authStorage";
import { buildApiUrl, buildHealthUrl } from "@/config/env";

const REQUEST_TIMEOUT_MS = 30000;

export type ApiErrorType = "network" | "http" | "parse" | "config";

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: ApiErrorType; message: string; data?: unknown };

type RequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string | null;
};

let unauthorizedHandler: (() => void | Promise<void>) | null = null;

export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null): void {
  unauthorizedHandler = handler;
}

function extractMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }
  return fallback;
}

async function parseJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const token = options.token === undefined ? await getStoredToken() : options.token;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...options.headers,
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(buildApiUrl(path), {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers,
      method: options.method || "GET",
      signal: controller.signal,
    });

    let data: unknown;
    try {
      data = await parseJson(response);
    } catch {
      return {
        ok: false,
        status: response.status,
        error: "parse",
        message: "Resposta inválida ou vazia do servidor.",
      };
    }

    if (response.status === 401) {
      await clearStoredToken();
      await unauthorizedHandler?.();
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: "http",
        message: extractMessage(data, "A API recusou a requisição."),
        data,
      };
    }

    return { ok: true, status: response.status, data: data as T };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "A API demorou demais para responder."
        : error instanceof Error
          ? error.message
          : "Não foi possível conectar à API.";

    return {
      ok: false,
      status: 0,
      error: message.includes("EXPO_PUBLIC_API_URL") ? "config" : "network",
      message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, body, method: "POST" }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, body, method: "PUT" }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, body, method: "PATCH" }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};

export async function healthCheck(): Promise<ApiResult<unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildHealthUrl(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const data = await parseJson(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: "http",
        message: extractMessage(data, "Healthcheck recusado pela API."),
        data,
      };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error && error.message.includes("EXPO_PUBLIC_API_URL") ? "config" : "network",
      message: error instanceof Error ? error.message : "Não foi possível consultar /health.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
