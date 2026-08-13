# BunkerMode — Sistema de Execução

BunkerMode é um sistema pessoal de execução. A versão 2.0 separa planejamento e execução:
o General planeja, o Soldado executa, e o histórico alimenta a revisão.

O backend ativo é TypeScript/NestJS com Prisma sobre PostgreSQL. A interface principal é a
web responsiva em React/Vite.

## Stack
- Backend: TypeScript + NestJS
- Banco: PostgreSQL + Prisma
- Frontend: React + Vite + TypeScript

## Variáveis de ambiente
- `DATABASE_URL`
- `DIRECT_URL` (opcional localmente; recomendado para migrations em Neon)
- `BUNKERMODE_AUTH_SECRET`
- `BUNKERMODE_CORS_ALLOW_ORIGINS`
- `PORT`
- `HOST`

## CORS
A API NestJS aceita origens locais por padrão. Em deploy, defina
`BUNKERMODE_CORS_ALLOW_ORIGINS` com a origem pública do frontend. Use vírgula para mais de uma
origem.

## Deploy Limpo

O estado atual não possui dados de produção a preservar. Para o próximo deploy, recrie/reset o
banco Neon e aplique a migration inicial limpa com Prisma.

### Neon

Use uma base PostgreSQL limpa.

- `DATABASE_URL`: URL pooled do Neon para runtime da API.
- `DIRECT_URL`: URL direct do Neon para operações administrativas/migrations.

Aplicar schema:

```bash
cd api
DATABASE_URL="$DIRECT_URL" npm run prisma:migrate:deploy
```

### Render

Configuração da API:

- Root Directory: `api`
- Build Command: `npm ci && npm run prisma:generate && npm run build`
- Start Command: `npm run start`
- Health Check Path: `/api/v2/health`

Variáveis:

```bash
NODE_ENV=production
BUNKERMODE_AUTH_SECRET=valor-seguro
BUNKERMODE_CORS_ALLOW_ORIGINS=https://app.exemplo.com
DATABASE_URL=postgresql://usuario:senha@host-pooler.neon.tech/banco?sslmode=require
DIRECT_URL=postgresql://usuario:senha@host.neon.tech/banco?sslmode=require
PORT=3000
HOST=0.0.0.0
```

### Vercel

Configuração do frontend:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

Defina `VITE_API_URL` com a URL pública da API. O frontend normaliza o prefixo `/api/v2`, então
estes dois formatos são válidos:

```bash
VITE_API_URL=https://api.exemplo.com
VITE_API_URL=https://api.exemplo.com/api/v2
```

Sem essa variável, o frontend em produção exibe erro de configuração da API.

## Rodar a API
```bash
cd api
npm install
npm run start:dev
```

Por padrão, a API escuta em `0.0.0.0:3000` se `HOST` e `PORT` não forem definidos.

## Migrations

Prisma é a fonte canônica do schema. Não existem dados de produção a preservar neste estágio:
o banco pode ser recriado/resetado para o próximo deploy limpo.

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:deploy
```

## Documentação
- `AGENTS.md`

## Endpoints úteis para integração
- `GET /api/v2/health`
- `GET /api/v2/health/database`
- `POST /api/v2/auth/register`
- `POST /api/v2/auth/login`
- `GET /api/v2/usuarios/me`
- `GET /api/v2/missoes`
- `POST /api/v2/missoes`
- `PATCH /api/v2/missoes/{missao_id}/concluir`
- `GET /api/v2/missoes/{missao_id}/historico`

## Testes
```bash
cd api
npm run prisma:validate
npm run prisma:generate
npm run lint
npm run build
npm run test
```

## Frontend

A interface principal fica em `frontend/`. A experiência mobile é atendida pela web
responsiva; não há app React Native/Expo na arquitetura 2.0.

```bash
cd frontend
npm install
npm run dev
```

Por padrão, o frontend usa a API em `http://127.0.0.1:3000/api/v2`.
Para alterar:

```bash
VITE_API_URL=http://127.0.0.1:3000/api/v2 npm run dev
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
