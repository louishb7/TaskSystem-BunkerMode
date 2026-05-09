# Sistema Visual Web

Data: 2026-05-09

## Filosofia

A web do BunkerMode deve parecer um posto operacional: escura, tática, contida e legível. A tensão vem dos dados e das decisões, não de excesso visual.

Evitar:

- HUD exagerado
- cyberpunk
- UI genérica de gerenciador de tarefas
- muitas variações de vermelho
- cards decorativos sem função

## Tokens

CSS variables ficam em:

```text
frontend-react/src/theme/tokens.css
```

Espelhos JS ficam em:

- `colors.js`
- `spacing.js`
- `typography.js`
- `tacticalTokens.js`
- `componentTokens.js`

## Paleta

- fundo: carvão/concreto escuro
- superfície: preto e cinza profundo
- texto: branco quebrado e cinzas
- alerta/decisão: vermelho restrito
- ativação/transição: âmbar único

## Componentes visuais

Painéis:

- `.panel`
- `.tactical-panel`
- `.lion-panel`
- `.transition-panel`

Botões:

- `.button.secondary`
- `.button.danger`
- `.button.danger.ghost`
- `.mode-switch`

Texto:

- `.section-kicker`
- `.muted`
- títulos `h1`, `h2`, `h3`

## Onde editar estilo

- Alterar cor ou espaçamento global: `theme/tokens.css`.
- Alterar comportamento de um componente existente: `styles.css`.
- Evitar inline style.
- Evitar criar nova cor fora dos tokens.
