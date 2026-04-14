# BunkerMode Task System

Backend em FastAPI para autenticação, criação de missões, controle de acesso por papel e histórico de auditoria.

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

## Rodar a API
```bash
python -m api
```

## Documentação
- `/docs`
- `/redoc`

## Testes
```bash
pytest
```
