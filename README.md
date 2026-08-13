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
- `BUNKERMODE_AUTH_SECRET`
- `BUNKERMODE_CORS_ALLOW_ORIGINS`
- `PORT`
- `HOST`

## CORS
A API NestJS aceita origens locais por padrão. Em deploy, defina
`BUNKERMODE_CORS_ALLOW_ORIGINS` com a origem pública do frontend. Use vírgula para mais de uma
origem.

## Deploy

No deploy do frontend, defina `VITE_API_URL` com a URL pública da API incluindo o prefixo
`/api/v2`.

Exemplo:

```bash
VITE_API_URL=https://api.exemplo.com/api/v2
```

Sem essa variável, o frontend em produção não tenta usar `127.0.0.1` e exibe erro de
configuração da API.

No deploy da API, defina:

```bash
BUNKERMODE_AUTH_SECRET=valor-seguro
BUNKERMODE_CORS_ALLOW_ORIGINS=https://app.exemplo.com
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
PORT=3000
HOST=0.0.0.0
```

## Rodar a API
```bash
cd api
npm install
npm run start:dev
```

Por padrão, a API escuta em `127.0.0.1:3000` se `HOST` e `PORT` não forem definidos.

## Migrations

O schema Prisma atual é baseline de preservação do PostgreSQL. Não rode migrations destrutivas
sem revisão explícita.

```bash
npm run prisma:validate
npm run prisma:generate
npm run baseline:check
```

Antes de deploy definitivo, compare o baseline com o banco real autorizado. O baseline atual foi
validado localmente.

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
npm run baseline:check
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
