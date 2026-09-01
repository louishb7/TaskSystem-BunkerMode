# BUNKERMODE — CONCEITO DO PRODUTO V2

## O QUE É

BunkerMode é uma ferramenta pessoal de produtividade orientada à execução.

Ele parte de uma ideia simples: planejar e executar exigem contextos diferentes. Misturar os dois momentos aumenta distração, renegociação constante e atrito.

O produto separa esses contextos por meio de dois modos de interface:
- General para planejar e organizar;
- Soldado para executar as Ordens do dia.

Essa separação organiza a experiência. Não cria papéis de autorização e não prende o usuário em um modo.

---

## IDENTIDADE CENTRAL

### General

General é o modo de planejamento.

Nele, o usuário:
- visualiza o calendário semanal;
- cria e edita Ordens;
- organiza prioridades;
- administra Objetivos;
- relaciona uma Ordem a um Objetivo quando isso acrescenta contexto.

### Soldado

Soldado é o modo de execução.

Nele, a interface:
- apresenta as Ordens do dia;
- reduz contexto e distrações;
- permite concluir uma Ordem;
- permite registrar falha;
- não exibe ferramentas de edição ou planejamento na própria tela.

Entrar no Soldado é uma transição explícita e pode exigir confirmação visual para dar peso à decisão.

O usuário pode retornar ao General a qualquer momento.

General e Soldado são modos de uso e interface. Não substituem autenticação, ownership, integridade ou qualquer outra autorização real do sistema.

`active_mode` pode continuar persistido como estado ou preferência da interface, mas não deve impedir operações normais do usuário por meio de `403`.

---

## ORDENS

Ordens são as unidades concretas de execução.

Uma Ordem pode ser:
- pontual;
- recorrente;
- vinculada a um Objetivo;
- independente de Objetivo.

O calendário semanal organiza quando as Ordens devem ser executadas.

Conclusão e falha são resultados objetivos. Falha não exige justificativa escrita obrigatória.

Resultados podem gerar histórico ou auditoria quando isso for tecnicamente útil para preservar integridade e contexto de execução.

---

## OBJETIVOS

Objetivo é uma feature independente administrada pelo General.

Relação conceitual:

```text
Objetivo
  -> pode possuir várias Ordens

Ordem
  -> pode não pertencer a nenhum Objetivo
  -> pode pertencer a no máximo um Objetivo
```

Objetivo não depende de Sonho, Montanha, Campanha ou outra camada estratégica.

Um Objetivo:
- pode existir sem Ordens vinculadas;
- aceita prazo opcional;
- não falha automaticamente por atraso;
- não é concluído automaticamente pela conclusão de Ordens;
- pode ter progresso definido manualmente pelo General enquanto essa informação for útil.

“Campanha” não deve ser introduzida como substituto de Objetivo.

---

## RECORRÊNCIA

Recorrência é uma capacidade central da V2 e uma propriedade da Ordem.

Portanto:
- Ordem sem Objetivo pode ser recorrente;
- Ordem com Objetivo pode ser recorrente;
- Objetivo não é requisito para recorrência;
- Sonho ou outra estrutura estratégica não pode ser requisito para criar ou materializar recorrências.

A modalidade “até o objetivo” pode existir como opção específica de uma Ordem recorrente vinculada a Objetivo. Ela não condiciona a recorrência em geral.

Detalhes técnicos de materialização, chave de recorrência e migração não fazem parte desta definição de domínio.

---

## O LOOP DO PRODUTO

O fluxo central é direto:

1. O General planeja e organiza.
2. O usuário entra explicitamente no Soldado quando deseja reduzir a interface para execução.
3. O Soldado apresenta as Ordens do dia.
4. O usuário conclui ou registra falha.
5. O resultado é persistido.
6. O usuário pode retornar ao General e reorganizar o planejamento quando necessário.

O sistema não trava decisões nem torna o Soldado irreversível.

Histórico objetivo pode apoiar decisões futuras, mas a Revisão Semanal atual não é obrigatória e não faz parte do núcleo V2.

---

## RESPONSABILIDADE SEM PUNIÇÃO

Ordens concluídas e falhas não devem desaparecer silenciosamente.

O sistema registra resultados de forma objetiva para preservar a realidade da execução. Isso não exige punição, justificativa manual ou gamificação.

O objetivo é oferecer clareza sobre o que foi planejado e o que foi executado.

---

## EXPERIÊNCIA E LINGUAGEM

BunkerMode passa a seguir uma direção de ferramenta de produtividade sóbria:
- interface simples;
- foco no fluxo real;
- domínio interno pode ser complexo sem expor complexidade desnecessária;
- General, Soldado e Ordem permanecem como metáforas funcionais;
- linguagem militar é usada somente quando acrescenta significado;
- nomenclaturas decorativas e metáforas concorrentes devem ser evitadas.

Leão do Dia, Caçada, Montanha, Sala de Guerra e termos equivalentes não fazem parte do núcleo V2.

Não adicionar pontos, streaks, badges, ranks, cards de métricas ou outras camadas de gamificação sem uma necessidade concreta validada.

---

## REVISÃO E HISTÓRICO

A implementação atual de Relatório/Revisão semanal sai do produto e deixa de ser obrigatória.

O backend pode preservar histórico ou auditoria objetiva de execução quando isso for útil para integridade, suporte ou evolução futura.

Uma futura feature de análise ou debriefing só deve ser criada a partir de necessidade concreta posterior. O código legado de Reviews não deve ser preservado por compatibilidade de produto.

---

## ESCOPO FUNCIONAL V2

Permanecem:
- autenticação;
- usuários;
- General;
- Soldado;
- Ordens/Missões;
- calendário semanal;
- recorrência;
- Objetivos;
- vínculo opcional `Ordem -> Objetivo`;
- conclusão e falha;
- histórico/auditoria objetiva quando tecnicamente útil.

Saem do produto:
- Montanha;
- Sonhos, inclusive principal e secundários;
- vínculo `Ordem -> Sonho`;
- vínculo `Objetivo -> Sonho`;
- Leão do Dia;
- Caçada;
- Relatório/Revisão semanal atual e sua obrigatoriedade;
- rail lateral atual;
- painel tático lateral atual;
- cards de métricas da home;
- terminologia militar excessiva.

A existência temporária desses conceitos no código ou no banco representa apenas estado legado durante a migração.

---

## PRINCÍPIOS DE PRODUTO E ENGENHARIA

- Clareza de execução é mais importante que riqueza conceitual.
- Novas features precisam justificar sua existência pelo fluxo real do produto.
- Frontend não é fonte da verdade.
- Depois de mutações, a API continua sendo a fonte de verdade.
- Não usar update otimista como estado definitivo.
- Autenticação, ownership, integridade e regras de domínio continuam no servidor.
- General e Soldado não substituem autorização.
- Preservar conclusão e registrar falha sem exigir escrita manual.
- Não adicionar gamificação, métricas ou abstrações sem necessidade concreta.

---

## ESTADO ATUAL E ESTADO ALVO

### Estado atual

Durante a migração, `sonho_id`, tabelas, endpoints e componentes relacionados a Sonhos, Montanha e Reviews ainda podem existir fisicamente.

### Estado alvo V2

- `sonho_id` não faz parte do contrato futuro de Missão;
- `sonho_id` não faz parte do contrato futuro de Objetivo;
- Objetivo é independente;
- recorrência não depende de estrutura estratégica;
- `active_mode` é preferência de interface, não autorização.

A remoção física desses elementos será feita em bloco técnico separado.

---

## STACK CANÔNICA

- Backend: TypeScript + NestJS.
- Persistência: PostgreSQL com Prisma.
- Frontend: React + Vite como web responsiva.

React Native/Expo não faz parte da arquitetura V2 atual.

---

## POR QUE O BUNKERMODE EXISTE

BunkerMode existe para reduzir a distância entre decisão e execução.

Seu valor não está em construir uma narrativa complexa, mas em oferecer:
- clareza para planejar;
- simplicidade para executar;
- registro objetivo dos resultados;
- liberdade para alternar conscientemente entre planejamento e ação.

O produto deve continuar simples o suficiente para que sua estrutura ajude o usuário, em vez de competir pela atenção dele.
