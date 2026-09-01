# BunkerMode — DECISÕES

Registro canônico de decisões de produto, UX e arquitetura.
Código legado pode divergir durante a migração; sua existência não mantém uma decisão de produto substituída.

Formato de cada entrada:
- **O quê:** decisão tomada
- **Por quê:** motivo
- **Status:** ativo | pendente | revisável | substituído | descartado | fora de escopo

---

## PRODUTO V2

### General e Soldado são modos de uso
- **O quê:** General e Soldado representam modos de interface. General planeja, organiza, cria e edita Ordens e administra Objetivos. Soldado reduz a interface às Ordens do dia e às ações de concluir ou registrar falha.
- **Por quê:** A separação reduz atrito cognitivo sem transformar uma metáfora funcional em papel de autorização.
- **Status:** ativo — decisão canônica V2

### `active_mode` é preferência de interface, não autorização
- **O quê:** `active_mode` pode continuar persistido e sua troca pode ocorrer pela API, mas o valor não deve causar `403` em operações normais do próprio usuário. Autenticação, ownership e integridade continuam validados no servidor.
- **Por quê:** Modo de uso não substitui controle de acesso.
- **Status:** ativo — substitui a decisão “Separação de modos é feita no servidor” quando ela atribuía efeito de autorização ao modo

### Entrada no Soldado é explícita e reversível
- **O quê:** Entrar no Soldado pode exigir confirmação visual. O usuário pode retornar ao General a qualquer momento.
- **Por quê:** A transição pode ter peso sem criar aprisionamento ou bloqueio de planejamento.
- **Status:** ativo — decisão canônica V2

### O Soldado executa só o dia atual
- **O quê:** A tela do Soldado apresenta apenas as Ordens do dia e ações de execução. Não oferece edição ou planejamento na própria tela.
- **Por quê:** O modo existe para reduzir contexto e favorecer ação.
- **Status:** ativo — preservado

### Falha não exige justificativa obrigatória
- **O quê:** Registrar falha não depende de escrita manual. O histórico objetivo pode manter data, estado e contexto técnico útil.
- **Por quê:** A falha precisa ser objetiva e rápida.
- **Status:** ativo — preservado

### Revisão semanal atual deixa de ser obrigatória
- **O quê:** Relatório/Revisão semanal atual e sua obrigação saem do produto. Histórico objetivo pode permanecer no backend. Uma futura análise ou debriefing exige necessidade concreta e decisão própria.
- **Por quê:** A implementação atual adiciona estrutura e interface que não são necessárias ao núcleo simplificado.
- **Status:** ativo — substitui “Revisão semanal é obrigatória”

---

## ESCOPO FUNCIONAL

### Capacidades mantidas
- **O quê:** autenticação, usuários, General, Soldado, Ordens/Missões, calendário semanal, recorrência, Objetivos, vínculo opcional `Ordem -> Objetivo`, conclusão, falha e histórico/auditoria objetiva quando tecnicamente útil.
- **Por quê:** Essas capacidades formam o fluxo mínimo de planejamento e execução da V2.
- **Status:** ativo

### Conceitos removidos
- **O quê:** Montanha, Sonhos, sonho principal/secundário, vínculos `Ordem -> Sonho` e `Objetivo -> Sonho`, Leão do Dia, Caçada, Relatório/Revisão semanal atual, rail lateral atual, painel tático lateral atual e cards de métricas da home.
- **Por quê:** São camadas conceituais ou visuais que aumentam complexidade sem fortalecer o fluxo mínimo.
- **Status:** ativo — remover em migração posterior

### Código legado não define escopo
- **O quê:** Controllers, services, componentes, campos e tabelas dos conceitos removidos podem existir temporariamente durante a migração.
- **Por quê:** Estado atual de implementação e direção canônica são coisas diferentes.
- **Status:** ativo

---

## OBJETIVOS

### Objetivo é uma feature independente
- **O quê:** Objetivo não depende de Sonho e não deve ser apresentado como Montanha, Campanha, topo ou etapa de escalada.
- **Por quê:** Objetivo precisa ser compreensível e útil sem uma hierarquia metafórica adicional.
- **Status:** ativo — substitui a estrutura `Sonho -> Objetivo -> Ordem`

### Vínculo Ordem → Objetivo é opcional e singular
- **O quê:** Uma Ordem pode não pertencer a Objetivo ou pertencer a exatamente um Objetivo. Um Objetivo pode possuir várias Ordens.
- **Por quê:** Objetivo oferece contexto sem ser requisito para execução.
- **Status:** ativo — preservado

### Objetivo pode nascer vazio
- **O quê:** Objetivo pode existir sem Ordens vinculadas.
- **Por quê:** Planejamento pode anteceder execução.
- **Status:** ativo — preservado

### Ciclo do Objetivo é decisão do General
- **O quê:** Objetivo aceita prazo opcional; não falha nem é concluído automaticamente por Ordens. Estados atuais `ativo`, `concluido`, `pausado` e `abandonado` e progresso manual podem permanecer enquanto úteis.
- **Por quê:** Objetivo representa direção, não execução unitária.
- **Status:** ativo — preservado e revisável quanto à UI

### “Campanha” não substitui Objetivo
- **O quê:** Não introduzir Campanha como novo nome ou camada acima de Objetivo.
- **Por quê:** Isso recriaria a complexidade removida com outra nomenclatura.
- **Status:** ativo

---

## RECORRÊNCIA

### Recorrência é propriedade da Ordem
- **O quê:** Ordem com ou sem Objetivo pode ser recorrente. Sonho ou outra estrutura estratégica não pode ser requisito para criação ou materialização.
- **Por quê:** Repetição é uma característica operacional da execução.
- **Status:** ativo — decisão canônica V2

### “Até o objetivo” é uma opção específica
- **O quê:** A modalidade pode permanecer para Ordem recorrente vinculada a Objetivo, mas não define nem condiciona a recorrência geral.
- **Por quê:** O vínculo acrescenta uma condição opcional, não a capacidade de repetir.
- **Status:** ativo — implementação posterior

---

## UX / INTERFACE

### Direção visual sóbria
- **O quê:** A interface deve ser simples e se comportar como ferramenta de produtividade. General, Soldado e Ordem permanecem como metáforas funcionais; linguagem militar só é usada quando acrescenta significado.
- **Por quê:** Clareza de execução é mais importante que riqueza temática.
- **Status:** ativo

### Terminologia decorativa é removida
- **O quê:** Leão do Dia, Caçada, Montanha, Sala de Guerra e equivalentes deixam de compor o núcleo da V2.
- **Por quê:** Múltiplas metáforas para o mesmo fluxo aumentam carga cognitiva.
- **Status:** ativo

### Confirmações destrutivas usam modal próprio
- **O quê:** Remover Ordem e ações destrutivas equivalentes usam `ConfirmDialog`, não `window.confirm()`.
- **Por quê:** Mantém consistência e controle da interação.
- **Status:** ativo — preservado

### Sem gamificação ou métricas sem necessidade
- **O quê:** Não adicionar pontos, streaks, badges, celebrações, ranks, cards de métricas ou abstrações analíticas sem problema concreto validado.
- **Por quê:** Dados devem ajudar decisão ou execução, não decorar a interface.
- **Status:** ativo

---

## ARQUITETURA

### Foco exclusivamente web
- **O quê:** O produto principal é a web responsiva. React Native/Expo não faz parte da arquitetura V2.
- **Por quê:** Consolidar uma interface principal reduz ruído operacional.
- **Status:** ativo — preservado

### Stack canônica
- **O quê:** Backend TypeScript + NestJS + Prisma + PostgreSQL; frontend React + Vite.
- **Por quê:** É a arquitetura real e vigente do repositório.
- **Status:** ativo — preservado

### Frontend não é fonte da verdade
- **O quê:** Depois de mutações, a visão é recarregada da API; não se usa update otimista como verdade definitiva.
- **Por quê:** Evita divergência entre estado local e persistido.
- **Status:** ativo — preservado

### Servidor preserva controles reais
- **O quê:** Autenticação, ownership, integridade de dados e regras de domínio continuam no servidor. General/Soldado não são usados como autorização.
- **Por quê:** Segurança e consistência não devem depender da interface nem de metáfora de produto.
- **Status:** ativo

### Mudanças de contrato exigem migração explícita
- **O quê:** Contratos não mudam acidentalmente. A remoção futura de `sonho_id` foi aprovada como estado alvo V2, mas só ocorre no bloco próprio de implementação e migração.
- **Por quê:** Frontend, backend e banco precisam mudar em ordem controlada.
- **Status:** ativo — substitui o congelamento absoluto do contrato apenas para esta mudança já decidida

---

## CONTRATOS: ESTADO ATUAL E ALVO

### Legado de `sonho_id`
- **O quê:** No estado atual, `sonho_id` ainda pode existir em Missão e Objetivo no código, API e banco. No estado alvo V2, será removido de ambos.
- **Por quê:** Documentar a transição evita tratar legado como visão de produto ou antecipar uma mudança física sem migração.
- **Status:** ativo — migração pendente

### Campos que sobrevivem
- **O quê:** Usuário mantém identidade, autenticação, `active_mode` e timezone. Missão mantém dados de execução, resultado, recorrência e `objetivo_id` opcional. Objetivo mantém dados próprios e relação com usuário e Ordens.
- **Por quê:** São os contratos necessários ao escopo funcional V2.
- **Status:** ativo

---

## FORA DE ESCOPO

### Integração com calendários externos
- **O quê:** Não implementar Google Calendar ou similares sem pedido explícito.
- **Status:** fora de escopo por ora

### Mobile React Native/Expo
- **O quê:** Não recriar aplicativo mobile sem pedido explícito.
- **Status:** fora de escopo

### Análise/debriefing futura
- **O quê:** Não recriar Reviews, Relatório ou substituto analítico sem necessidade concreta posterior.
- **Status:** fora de escopo por ora

---

## DECISÕES EXPLICITAMENTE SUBSTITUÍDAS

- “Separação de modos é feita no servidor” quando significava bloquear planejamento por `active_mode`: substituída por modos de interface com controles reais de autenticação e ownership no servidor.
- “Revisão semanal é obrigatória”: substituída pela remoção da revisão atual e preservação opcional de histórico objetivo.
- “Montanha deve parecer hierarquia” e “Linguagem da Montanha usa Ordens”: substituídas pela remoção da Montanha.
- Estrutura de Sonhos principal/secundários e seus fluxos: substituída pela remoção de Sonhos.
- `Sonho -> Objetivo -> Ordem`: substituída por Objetivo independente e vínculo opcional `Ordem -> Objetivo`.
- Ordem vinculada diretamente ao Sonho: substituída pela remoção do vínculo.
- Objetivo concluído com vínculo histórico ao Sonho: substituída por histórico próprio do Objetivo, sem Sonho.
- Objetivos como contexto de revisão/relatório: substituída pela remoção da implementação atual de Reviews.
- Visualização gráfica futura da Montanha: descartada porque a própria Montanha saiu do produto.
