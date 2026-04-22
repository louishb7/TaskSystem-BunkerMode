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

## Interface mínima de teste (v3)

A pasta `frontend/` contém uma interface simples em HTML, CSS e JavaScript puro para testar a API manualmente.

Arquivos:
- `frontend/index.html`
- `frontend/style.css`
- `frontend/app.js`

Fluxos disponíveis:
- registrar usuário
- login
- restaurar sessão com `localStorage`
- consultar `/usuarios/me`
- criar missão
- listar missões
- concluir missão
- ver histórico de uma missão
- apagar missão

Abra o arquivo `frontend/index.html` no navegador e mantenha a API rodando localmente em `http://127.0.0.1:8000`.

## Exclusão de missão

Novo endpoint disponível:

- `DELETE /api/v2/missoes/{missao_id}`

Comportamento:
- retorna `204 No Content` ao apagar com sucesso
- retorna `404` se a missão não existir
- exige autenticação por Bearer token
