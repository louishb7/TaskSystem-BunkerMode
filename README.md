# BunkerMode

Aplicação full stack de organização pessoal, construída como uma experiência única: o Bunker. Tarefas e Objetivos são módulos independentes que cada pessoa pode habilitar conforme sua necessidade, mantendo a relação entre eles opcional.

[Live Demo](https://bunkermodeproject.vercel.app/)

## Sobre o projeto

O Bunker reúne planejamento e execução sem transformar cada capacidade em um produto separado. O módulo de Tarefas concentra o trabalho do dia; Objetivos organizam direções e podem, opcionalmente, dar contexto às tarefas.

## Funcionalidades

- Módulo de Tarefas com calendário semanal e Modo Foco.
- Tarefas pontuais ou recorrentes.
- Identificação de tarefas passadas não concluídas como “Não realizadas”.
- Módulo de Objetivos independente, com associação opcional a tarefas.
- Habilitação e desabilitação de módulos sem exclusão de dados.
- Autenticação de usuários.
- Tema Sistema, Claro e Escuro.
- Interface responsiva.

## Stack

Frontend:

- TypeScript
- React
- Vite
- Tailwind CSS

Backend:

- Node.js
- NestJS
- Prisma
- PostgreSQL

Infra e qualidade:

- Docker
- Jest
- Vercel

## Arquitetura

```text
React + Vite → API NestJS → Prisma → PostgreSQL
```

O frontend e a API ficam em diretórios independentes (`frontend/` e `api/`). A API concentra autenticação, regras de domínio e acesso ao banco.

## Executando localmente

É necessário Node.js 24 e uma instância PostgreSQL.

1. Configure a API a partir do exemplo seguro de variáveis:

   ```bash
   cd api
   cp .env.example .env
   ```

   Preencha `DATABASE_URL` e substitua `BUNKERMODE_AUTH_SECRET` por um valor local. As demais variáveis e seus exemplos estão em `api/.env.example`.

2. Instale as dependências, gere o cliente Prisma e aplique as migrations no banco local:

   ```bash
   npm ci
   npm run prisma:generate
   npm run prisma:migrate:dev
   npm run start:dev
   ```

3. Em outro terminal, inicie o frontend:

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

Por padrão, o frontend usa `http://127.0.0.1:3000/api/v2`. Para apontá-lo a outra API, defina `VITE_API_URL` antes de executar `npm run dev`.

## Testes e qualidade

Backend:

```bash
cd api
npm run lint
npm run build
npm test
npm run prisma:validate
```

Frontend:

```bash
cd frontend
npm run lint
npm run check
npm run format:check
node --test test/*.test.mjs
```
