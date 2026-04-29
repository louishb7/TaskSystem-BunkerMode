# BunkerMode Mobile

Cliente React Native do BunkerMode. O mobile é a experiência principal do produto.

## Escopo

- Entrada usando a API existente.
- Pilha do General para planejamento e revisão.
- Pilha do Soldado para execução sem renegociação.
- A seleção da pilha vem de `usuario.active_mode`, retornado pela API.
- A lista de missões operacionais vem da API existente.
- Missões só podem ser concluídas quando `permissions.can_complete` for `true`.
- O retorno ao General usa o fluxo de liberação do backend.
- Textos visíveis ao usuário devem permanecer em português.

## Executar

```bash
cd mobile
npm install
npm run start
```

Por padrão, o app usa:

```bash
http://127.0.0.1:8000/api/v2
```

Para usar em dispositivo ou emulador:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v2 npm run start
```

Use `10.0.2.2` no emulador Android quando a API estiver rodando na máquina host.
