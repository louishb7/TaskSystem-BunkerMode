# Fluxo de Estado Web

Data: 2026-05-09

## Sessão

Sessão fica em `features/auth/hooks/useAuthSession.js`.

Responsabilidades:

- ler token e usuário do `localStorage`
- restaurar usuário com `GET /usuarios/me`
- login
- cadastro
- logout local
- tratar 401 e limpar sessão
- recarregar usuário após troca de modo

Chaves:

- `bunkermode_token`
- `bunkermode_usuario`

## Quadro operacional

Missões ficam em `features/missions/hooks/useMissionBoard.js`.

Responsabilidades:

- carregar quadro General
- carregar quadro Soldado
- carregar Pós-Ação
- criar ordem
- editar ordem
- remover ordem
- alternar prioridade elevada
- concluir ordem
- registrar justificativa
- revisar falha

Depois de qualquer mutação, o hook recarrega dados da API. Não há update otimista.

## Rota interna

`routes/routeConstants.js` define:

- `general.home`
- `general.review`

Não há `react-router` no projeto. A navegação atual é estado local em `app/App.jsx`.

## Modo ativo

`usuario.active_mode` decide a tela:

- `general`: Posto de Comando ou Pós-Ação.
- `soldier`: tela de execução.

Troca de modo sempre chama backend e recarrega usuário.
