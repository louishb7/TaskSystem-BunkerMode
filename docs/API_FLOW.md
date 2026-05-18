# Fluxo de API do Web

Data: 2026-05-09

## Arquivos

- `frontend-react/src/api/config.js`: URL base da API.
- `frontend-react/src/api/httpClient.js`: `fetch`, parse de resposta e erro comum.
- `frontend-react/src/services/bunkermodeApi.js`: operações da API BunkerMode.
- `frontend-react/src/types/missionContract.js`: valida contrato de missão.

## URL da API

Padrão:

```bash
http://127.0.0.1:8000/api/v2
```

Override:

```bash
VITE_API_URL=http://127.0.0.1:8000/api/v2 npm run dev
```

## Autenticação

O token é enviado como:

```text
Authorization: Bearer <token>
```

401 é tratado em `useAuthSession.handleUnauthorized`, que limpa sessão local.

## Contrato de missão

Toda resposta de missão passa por `assertMissionContract`.

Campos protegidos:

- `status_code`
- `status_label`
- `permissions.can_complete`
- `permissions.can_edit`
- `permissions.can_delete`
- `permissions.can_justify`
- `permissions.can_review`
- `permissions.can_view_history`

## Como adicionar endpoint

1. Adicionar função em `services/bunkermodeApi.js`.
2. Usar `requestMission` ou `requestMissionList` se retornar missão.
3. Consumir a função dentro de hook da feature.
4. Recarregar dados após mutação.
