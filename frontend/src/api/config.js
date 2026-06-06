const LOCAL_API_URL = "http://127.0.0.1:8000/api/v2";

function normalizeApiUrl(apiUrl) {
  return apiUrl.replace(/\/+$/, "");
}

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim() || "";

export const API_CONFIG_ERROR =
  import.meta.env.PROD && !configuredApiUrl
    ? "Configuração da API ausente no deploy. Defina VITE_API_URL com a URL pública da API."
    : "";

export const API_URL = configuredApiUrl
  ? normalizeApiUrl(configuredApiUrl)
  : import.meta.env.DEV
    ? LOCAL_API_URL
    : "";
