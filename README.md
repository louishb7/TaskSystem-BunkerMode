# BunkerMode — Sistema de Execução

Backend em FastAPI para autenticação, criação de missões, listagem de missões e histórico de auditoria.

## Stack técnico
- FastAPI
- PostgreSQL com SQLAlchemy ORM e psycopg 3
- Alembic
- Pytest
- React com Vite

## Variáveis de ambiente
- `BUNKERMODE_DB_URL` ou
- `BUNKERMODE_DB_NAME`
- `BUNKERMODE_DB_USER`
- `BUNKERMODE_DB_PASSWORD`
- `BUNKERMODE_DB_HOST`
- `BUNKERMODE_DB_PORT`
- `BUNKERMODE_AUTH_SECRET`
- `BUNKERMODE_ENV`
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

Se a variável não for definida em desenvolvimento, a API permite apenas origens locais conhecidas.
Em produção (`BUNKERMODE_ENV=production`), `BUNKERMODE_CORS_ALLOW_ORIGINS` é obrigatório.

## Deploy

No deploy do frontend, defina `VITE_API_URL` com a URL pública da API incluindo o prefixo `/api/v2`.

Exemplo:

```bash
VITE_API_URL=https://api.exemplo.com/api/v2
```

Sem essa variável, o frontend em produção não tenta usar `127.0.0.1` e exibe erro de configuração da API.

No deploy da API, defina:

```bash
BUNKERMODE_ENV=production
BUNKERMODE_CORS_ALLOW_ORIGINS=https://site.exemplo.com
BUNKERMODE_AUTH_SECRET=valor-seguro
BUNKERMODE_DB_URL=postgresql://usuario:senha@host:5432/banco
```

Se iniciar a API por `python -m api`, o host padrão já escuta em `0.0.0.0`. É possível sobrescrever com `BUNKERMODE_API_HOST`.

## Rodar a API
```bash
cd backend
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

O atalho `python -m api` continua disponível e usa o mesmo entrypoint.

## Migrations

Novo ambiente:

```bash
alembic upgrade head
```

Nova migration após alterar `backend/database/orm_models.py`:

```bash
alembic revision --autogenerate -m "descrição da mudança"
# revisar o arquivo gerado em alembic/versions/
alembic upgrade head
```

## Documentação
- `/docs`
- `/redoc`
- `API.md`
- `AUTH.md`

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

## Frontend

A interface principal fica em `frontend/`.

```bash
cd frontend
npm install
npm run dev
```

Por padrão, o frontend usa a API em `http://127.0.0.1:8000/api/v2`.
Para alterar:

```bash
VITE_API_URL=http://127.0.0.1:8000/api/v2 npm run dev
```

Check web disponível:

```bash
npm run check
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

## Exclusão de missão

Novo endpoint disponível:

- `DELETE /api/v2/missoes/{missao_id}`

Comportamento:
- retorna `204 No Content` ao apagar com sucesso
- retorna `404` se a missão não existir
- exige autenticação por Bearer token
