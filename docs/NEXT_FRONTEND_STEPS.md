# Próximos Passos do Frontend

Data: 2026-05-09

## Prioridade alta

1. Usar a web diariamente por alguns dias e registrar atritos reais.
2. Validar o ciclo: criar ordem, marcar Decidida, ativar Soldado, executar, retornar ao comando.
3. Validar falha: ordem vencida, justificativa no Soldado, decisão no Pós-Ação.
4. Consolidar Revisão Semanal como tela própria quando o produto pedir.

## Melhorias seguras

- Trocar `window.confirm` da remoção por modal próprio dentro de `features/missions`.
- Adicionar testes de UI quando uma ferramenta de teste web for escolhida.
- Adicionar lint apenas quando houver decisão de padrão.
- Criar rota real com `react-router` só se houver múltiplas telas persistentes por URL.
- Separar `styles.css` em arquivos por camada se o CSS crescer muito mais.

## Cuidados

- Não expor Alta/Média/Baixa.
- Não usar `prioridade` para UI.
- Não permitir ações de planejamento no Soldado.
- Não executar missão no General.
- Não fazer update otimista em mutações.
- Não importar assets de `docs/design-references` no runtime.

## Onde mexer primeiro

- Bugs de sessão: `features/auth/hooks/useAuthSession.js`.
- Bugs de missão: `features/missions/hooks/useMissionBoard.js`.
- Layout General: `features/general/pages/GeneralCommandPage.jsx` e componentes da pasta `general/components`.
- Layout Soldado: `features/soldier/pages/SoldierExecutionPage.jsx`.
- Pós-Ação: `features/review`.
- Cores e espaçamento: `theme/tokens.css`.
