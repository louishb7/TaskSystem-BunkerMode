# Autenticação

Sistema baseado em token (Bearer).

Fluxo:
1. Registro com usuário e e-mail
2. Entrada
3. Recebe token
4. Usa token nas rotas protegidas

Variáveis obrigatórias:
- `BUNKERMODE_AUTH_SECRET`
