# Autenticação

Sistema baseado em token (Bearer).

Fluxo:
1. Registro com código de convite
2. Entrada
3. Recebe token
4. Usa token nas rotas protegidas

Variáveis obrigatórias:
- `BUNKERMODE_AUTH_SECRET`
- `BUNKERMODE_REGISTRATION_INVITE_CODE`
