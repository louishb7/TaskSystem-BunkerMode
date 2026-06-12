const API_V2_SUFFIX = "/api/v2";

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;

  if (
    !configuredUrl ||
    !configuredUrl.trim() ||
    configuredUrl.includes("URL_DA_API_EM_PRODUCAO")
  ) {
    throw new Error(
      "Configuração da API ausente. Defina EXPO_PUBLIC_API_URL no arquivo mobile/.env."
    );
  }

  return normalizeBaseUrl(configuredUrl);
}

export function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const apiBase = baseUrl.endsWith(API_V2_SUFFIX) ? baseUrl : `${baseUrl}${API_V2_SUFFIX}`;
  return `${apiBase}${normalizedPath}`;
}

export function buildHealthUrl(): string {
  return `${getApiBaseUrl()}/health`;
}
