# Estrutura do Web

Data: 2026-05-09

## Diretórios principais

`frontend-react/src/app`
Entrada da aplicação web. Mantém composição e fronteira de erro.

`frontend-react/src/features/auth`
Login, cadastro e hook de sessão.

`frontend-react/src/features/general`
Posto de Comando, Semana Operacional, Leão do Dia, Ordens do Dia e ativação do Soldado.

`frontend-react/src/features/soldier`
Modo Soldado, execução, justificativa e retorno ao comando.

`frontend-react/src/features/missions`
Cards, formulário, seletores e hook do quadro operacional.

`frontend-react/src/features/review`
Pós-Ação e revisão de falhas.

`frontend-react/src/features/calendar`
Semana operacional, datas e seletor de dias.

`frontend-react/src/components/ui`
Peças globais pequenas: símbolo, aviso, estado vazio.

`frontend-react/src/components/tactical`
Estrutura visual tática compartilhada.

`frontend-react/src/api`
HTTP básico, URL da API e tratamento comum de resposta.

`frontend-react/src/services`
Cliente BunkerMode usado pelas features.

`frontend-react/src/theme`
Tokens de cor, espaçamento, tipografia e CSS variables.

## Onde adicionar código novo

- Nova tela de produto: criar ou expandir uma feature.
- Novo componente usado por uma única feature: colocar dentro da própria feature.
- Novo componente visual genérico: colocar em `components/ui`.
- Nova chamada de backend: adicionar em `services/bunkermodeApi.js`.
- Novo token visual: adicionar em `theme/tokens.css` e, se útil para JS, em `theme/*.js`.
