# BunkerMode Task System

Backend em FastAPI para autenticação, criação de missões, listagem de missões e histórico de auditoria.

## Stack
- FastAPI
- PostgreSQL com psycopg 3
- Pytest

## Variáveis de ambiente
- `BUNKERMODE_DB_URL` ou
- `BUNKERMODE_DB_NAME`
- `BUNKERMODE_DB_USER`
- `BUNKERMODE_DB_PASSWORD`
- `BUNKERMODE_DB_HOST`
- `BUNKERMODE_DB_PORT`
- `BUNKERMODE_AUTH_SECRET`
- `BUNKERMODE_API_HOST`
- `BUNKERMODE_API_PORT`
- `BUNKERMODE_API_RELOAD`
- `BUNKERMODE_CORS_ALLOW_ORIGINS`

## CORS
A API aceita origens configuradas pela variável `BUNKERMODE_CORS_ALLOW_ORIGINS`.

Exemplo:

```bash
BUNKERMODE_CORS_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:5173
```

Se a variável não for definida, a API sobe com `*`, o que facilita testes locais com uma interface simples.

## Rodar a API
```bash
python -m api
```

## Documentação
- `/docs`
- `/redoc`

## Endpoints úteis para integração
- `GET /api/v2/health`
- `POST /api/v2/auth/register`
- `POST /api/v2/auth/login`
- `GET /api/v2/usuarios/me`
- `GET /api/v2/missoes`
- `POST /api/v2/missoes`
- `PATCH /api/v2/missoes/{missao_id}/concluir`
- `GET /api/v2/missoes/{missao_id}/historico`

## Testes
```bash
pytest
```

## Frontend React

A interface principal fica em `frontend-react/`.

```bash
cd frontend-react
npm install
npm run dev
```

Por padrão, o frontend usa a API em `http://127.0.0.1:8000/api/v2`.
Para alterar:

```bash
VITE_API_URL=http://127.0.0.1:8000/api/v2 npm run dev
```

Fluxos disponíveis:
- cadastro e login como entrada da aplicação
- logout
- criação de missão
- listagem, filtros e ordenação
- edição de missão
- conclusão de missão
- histórico de missão
- exclusão de missão

A pasta `frontend/` foi mantida temporariamente como referência legada da versão HTML/CSS/JS puro.

## Exclusão de missão

Novo endpoint disponível:

- `DELETE /api/v2/missoes/{missao_id}`

Comportamento:
- retorna `204 No Content` ao apagar com sucesso
- retorna `404` se a missão não existir
- exige autenticação por Bearer token

