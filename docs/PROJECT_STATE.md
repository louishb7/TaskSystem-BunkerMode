# Estado Atual do Projeto

Data: 2026-05-09

## Visão geral

BunkerMode está organizado em três superfícies ativas:

- Backend FastAPI na raiz, com rotas em `api/`, regras em `services/`, persistência em `repositorio_postgres.py` e modelos de domínio em `missao.py` e `usuario.py`.
- Mobile React Native + Expo em `mobile/`, hoje a experiência principal do produto.
- Web React + Vite em `frontend-react/`, espelhando a linguagem e os fluxos centrais do mobile.

Fluxo esperado: General cria ordens, o sistema preserva a decisão, Soldado executa sem renegociar, falhas geram justificativa e o General revisa no Pós-Ação.

## Backend

- Contrato principal em `/api/v2`.
- Autenticação por Bearer token.
- `permissions` de missão são calculadas no servidor e consumidas por mobile/web.
- `prioridade` permanece no banco, schema e payload por compatibilidade legada. A UI não deve expor Alta/Média/Baixa nem permitir planejamento por prioridade.
- Decidida é o compromisso operacional visível do produto.
- Modo Soldado bloqueia criação, edição, remoção, histórico, relatório e revisão.

## Mobile

- App Expo em `mobile/`.
- `usuario.active_mode` decide a pilha: General ou Soldado.
- General mostra Posto de Comando, Semana Operacional, Leão do Dia, Ordens do Dia, Decidida e Pós-Ação.
- Soldado mostra apenas ordens executáveis ou justificáveis e a ação de Retornar ao Comando.
- O fallback atual da API no cliente mobile é `http://192.168.18.71:8000/api/v2`; para uso real, definir `EXPO_PUBLIC_API_URL`.

## Web

- App Vite em `frontend-react/`.
- Usa o mesmo contrato de API e valida `status_code`, `status_label` e `permissions`.
- Espelha os conceitos principais do mobile: Posto de Comando, Semana Operacional, Leão do Dia, Ordens do Dia, Decidida, Modo Soldado e Pós-Ação.
- Não tem lint configurado no `package.json`; o check disponível hoje é build.

## Linguagem do produto

Termos ativos:

- BunkerMode
- General
- Soldado
- Posto de Comando
- Modo Soldado
- Leão do Dia
- Semana Operacional
- Ordens do Dia
- Criar nova ordem
- Decidida
- Pós-Ação
- Ativar Soldado
- Retornar ao Comando

Textos visíveis ao usuário devem permanecer em português.

## Assets

- Assets usados em runtime ficam em `mobile/src/assets/` e `frontend-react/src/assets/`.
- Referências visuais pesadas ficam em `docs/design-references/bunkermode/`.
- O símbolo usado em runtime foi reduzido para 512 x 512.
- A fonte 2048 x 2048 do símbolo fica preservada em `docs/design-references/bunkermode/logo_final_selected.png`.

## Dívida técnica conhecida

- `prioridade` ainda existe no backend e no banco por compatibilidade. Remover exige migração planejada e mudança de contrato.
- Mobile e web duplicam parte da lógica de data e contrato por estarem em projetos separados.
- O fallback de API do mobile é um IP local específico; usar variável de ambiente para execução fora dessa máquina.
- A regra futura de janela de retorno ao General está desativada em `AuthService.GENERAL_UNLOCK_WINDOW_ENFORCEMENT_ENABLED`.

## Dívida de UX conhecida

- Revisão Semanal existe no backend, mas ainda precisa de consolidação de experiência no produto.
- Web e mobile estão consistentes em linguagem, mas não são pixel-perfect.
- Remoção de ordem no web usa confirmação nativa do navegador; pode virar modal próprio depois.
- Onboarding inicial ainda não foi implementado e não deve ser iniciado sem decisão explícita.

## Como rodar

Backend:

```bash
.venv/bin/python -m api
```

ou:

```bash
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

Mobile:

```bash
cd mobile
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v2 npm run start
```

Web:

```bash
cd frontend-react
npm run dev
```

Testes backend:

```bash
.venv/bin/python -m pytest
```

Build web:

```bash
npm --prefix frontend-react run build
```

Export mobile:

```bash
npm --prefix mobile exec -- expo export --platform all --output-dir dist-test
```

## Próximo trabalho recomendado

1. Validar manualmente o ciclo completo General -> Soldado -> Pós-Ação em mobile.
2. Consolidar a experiência da Revisão Semanal usando dados reais do backend.
3. Definir a estratégia de remoção futura de `prioridade` do banco/API.
4. Ajustar o fallback de API mobile para não depender de IP local específico.
