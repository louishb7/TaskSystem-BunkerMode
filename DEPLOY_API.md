# DEPLOY_API — BunkerMode

## Plataforma
[preencher: Railway / Render / VPS / outra]

## Build command
```bash
docker build -t bunkermode-api ./backend
```

ATENÇÃO: o build context DEVE ser `./backend`, não a raiz do projeto.

## Start command
```bash
uvicorn backend.api.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

## Variáveis de ambiente obrigatórias em produção
```bash
BUNKERMODE_ENV=production # OBRIGATÓRIA — deve ser "production" em produção
BUNKERMODE_AUTH_SECRET=valor-secreto-forte # OBRIGATÓRIA — crasha no boot se ausente
BUNKERMODE_CORS_ALLOW_ORIGINS=https://bunkermodeproject.vercel.app # OBRIGATÓRIA em produção
BUNKERMODE_DB_URL=postgresql://user:pass@host:5432/dbname # OBRIGATÓRIA em produção
```

## Variáveis opcionais
```bash
BUNKERMODE_DB_NAME=bunkermode # opcional (default: bunkermode)
BUNKERMODE_DB_USER=usuario-do-banco # opcional se BUNKERMODE_DB_URL for usado
BUNKERMODE_DB_PASSWORD=senha-do-banco # opcional se BUNKERMODE_DB_URL for usado
BUNKERMODE_DB_HOST=host-do-banco # opcional se BUNKERMODE_DB_URL for usado — default localhost é INVÁLIDO em produção
BUNKERMODE_DB_PORT=5432 # opcional (default: 5432)
BUNKERMODE_API_HOST=0.0.0.0 # opcional (default: 0.0.0.0)
BUNKERMODE_API_PORT=8000 # opcional (default: 8000)
BUNKERMODE_REGISTRATION_INVITE_CODE=codigo-de-convite-opcional # opcional — verificar se é obrigatória
```

## Como testar antes do deploy
```bash
BUNKERMODE_ENV=production \
BUNKERMODE_AUTH_SECRET=valor_real \
BUNKERMODE_CORS_ALLOW_ORIGINS=https://bunkermodeproject.vercel.app \
BUNKERMODE_DB_URL=postgresql://user:pass@host:5432/dbname \
python -c "from backend.api.main import app; print('Boot OK')"
```

## Healthcheck
`GET /health` deve retornar `{"status": "ok", ...}`.

## Erros comuns
- `RuntimeError: Defina BUNKERMODE_AUTH_SECRET` → env não foi definida na plataforma
- `RuntimeError: Defina BUNKERMODE_CORS_ALLOW_ORIGINS` → env não foi definida na plataforma
- `Banco disconnected` → `BUNKERMODE_DB_URL` aponta para localhost ou está errada
