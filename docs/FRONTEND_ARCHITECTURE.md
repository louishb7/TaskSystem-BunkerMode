# Arquitetura do Frontend Web

Data: 2026-05-09

## Raiz

O frontend web principal continua em `frontend-react/`, conforme `AGENTS.md` e scripts existentes.

## Camadas

- `src/app/`: montagem da aplicação, fronteira de erro e composição das telas.
- `src/features/`: domínio de produto por fluxo.
- `src/components/`: componentes globais pequenos e sem regra de negócio.
- `src/api/`: configuração e cliente HTTP bruto.
- `src/services/`: serviços que expõem operações da API.
- `src/theme/`: tokens visuais em CSS e JS.
- `src/types/`: validações de contrato consumidas pelo frontend.
- `src/utils/`: funções genéricas.
- `src/routes/`: rotas internas sem dependência de roteador externo.

## Fluxo principal

`main.jsx` monta `AppErrorBoundary` e `App`.

`app/App.jsx` decide:

- não autenticado -> `features/auth/components/AuthScreen.jsx`
- modo General -> `features/general/pages/GeneralCommandPage.jsx`
- Pós-Ação -> `features/review/pages/ReviewPage.jsx`
- modo Soldado -> `features/soldier/pages/SoldierExecutionPage.jsx`

## Regra de arquitetura

Feature que tem regra de produto fica em `features/<nome>`. Componente visual genérico fica em `components/ui` ou `components/tactical`.

Não colocar novas regras de missão, autenticação ou modo dentro de `App.jsx`.
