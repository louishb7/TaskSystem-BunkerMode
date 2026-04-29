# Auditoria de idioma e UI

## Regra aplicada

Produto, interface visível e documentação operacional devem usar português. Código técnico pode manter inglês quando isso preservar contratos, bibliotecas, padrões React/React Native ou reduzir risco.

## Arquivos com textos visíveis em inglês encontrados

- `mobile/src/components/ModeSwitcher.js`: textos de modo e ação em inglês.
- `mobile/src/screens/GeneralDashboardScreen.js`: títulos "DREAM", "OBJECTIVES", "MISSIONS", "HISTORY / REVIEW" e subtítulos sem acento.
- `mobile/src/screens/soldier/SoldierDashboard.js`: título "SOLDIER" e frase "EXECUTION ONLY / MISSIONS".
- `mobile/src/screens/LoginScreen.js`: frase de entrada com composição parcialmente técnica.
- `mobile/README.md`: documentação operacional em inglês.

## Arquivos que misturavam português e inglês na experiência

- `mobile/src/components/ModeSwitcher.js`
- `mobile/src/screens/GeneralDashboardScreen.js`
- `mobile/src/screens/soldier/SoldierDashboard.js`
- `mobile/src/screens/LoginScreen.js`
- `mobile/src/screens/MissionFormScreen.js`
- `mobile/src/components/ReviewBlock.js`
- `mobile/src/components/ReviewCard.js`
- `mobile/src/components/GeneralMissionCard.js`
- `mobile/src/components/PriorityBar.js`

## Correções aplicadas

- Botões, labels, títulos, placeholders, mensagens e estados vazios do mobile foram padronizados para português.
- Termos técnicos internos como `mode`, `soldier`, `general`, `permissions`, `active_mode` e nomes de componentes foram preservados para evitar risco estrutural.
- A tela do Soldado manteve o fluxo atual, mas seus textos visíveis foram traduzidos.
- A tela do General manteve a estrutura segura atual, com textos em português.

## Alternativas seguras para o Posto do General

### Alternativa A — Posto Operacional

Primeira tela com cabeçalho forte "Posto do General", seguida por uma faixa única de estado do sistema e uma lista de ordens. Menos painéis equivalentes. A Montanha aparece como uma trilha curta em linha: Sonho → Objetivos → Missões.

Vantagem: reduz sensação de dashboard genérico sem reescrever fluxo.

### Alternativa B — Mesa de Planejamento

Topo com identidade do General e botão de ativar Soldado. Abaixo, duas áreas: "Decidir" para missão ativa e "Revisar" para pendências. Relatório semanal fica recolhido ou abaixo da lista.

Vantagem: organiza por ação mental, não por métrica.

### Alternativa C — Quadro de Ordens

Lista de missões como superfície principal. Métricas viram uma linha compacta. Revisão aparece como alerta operacional antes da lista quando existir.

Vantagem: reforça que o General prepara o Soldado, não administra um painel.

## Regra futura: colher de chá de 7 dias

Não foi implementada porque o contrato atual de usuário não expõe data de criação.

Falta no backend/API:

- Campo persistido de criação do usuário, por exemplo `created_at`.
- Exposição desse campo em `/usuarios/me`.
- Regra de domínio para calcular se o usuário está nos primeiros 7 dias.
- Mensagem de aviso no payload ou cálculo confiável no frontend a partir de `created_at`.

Sem esse campo, qualquer implementação no frontend seria inferida e frágil.
