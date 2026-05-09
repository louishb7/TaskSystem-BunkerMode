# Guia de Componentes Web

Data: 2026-05-09

## Componentes globais

- `BrandSymbol`: símbolo oficial General/Soldado.
- `StatusNotice`: mensagens de erro, sucesso e aviso.
- `EmptyState`: estados vazios sem regra de negócio.
- `TacticalShell`: fundo e espaçamento base das telas General/Soldado.
- `BootScreen`: carregamento inicial.

## Componentes por feature

General:

- `CommandRail`: identidade do Posto de Comando, Pós-Ação e sair.
- `WeekPanel`: painel da Semana Operacional.
- `LionPanel`: resumo do Leão do Dia.
- `OrdersPanel`: lista de ordens do dia.
- `ModeTransitionPanel`: ativação do Soldado.
- `CommandConsole`: ação lateral para criar ordem.

Missões:

- `MissionCard`: card General ou Soldado conforme `variant`.
- `MissionForm`: criação e edição de ordem.
- `FailureJustificationForm`: justificativa do Soldado.

Soldado:

- `SoldierExecutionPage`: tela de execução.
- `ReturnToCommandDialog`: senha e confirmação de retorno.

Pós-Ação:

- `ReviewPage`: tela dedicada.
- `GeneralReviewPanel`: lista de falhas aguardando decisão.

## Regras

- Texto visível ao usuário sempre em português.
- Soldado não recebe ações de planejamento.
- General não executa ordem.
- Card de missão deve respeitar `permissions` vindo da API.
- Não ler `prioridade` para decisão visual.
- Após mutação, recarregar da API.
