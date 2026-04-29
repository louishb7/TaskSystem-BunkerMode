# Regra de 7 dias para novos usuários

## Objetivo

Permitir que novos usuários alternem livremente entre General e Soldado durante os primeiros 7 dias de uso, com aviso claro de que essa liberdade é temporária.

## Estado atual

A regra não deve ser implementada ainda porque o contrato atual de usuário não expõe uma data confiável de criação da conta.

Campo ausente:

- `created_at`

Sem esse campo no backend/API, qualquer cálculo no frontend seria inferido e inseguro.

## O que precisa no backend

1. Persistir `created_at` no usuário no momento do cadastro.
2. Reconstituir `created_at` no modelo `Usuario`.
3. Expor `created_at` em `/api/v2/usuarios/me`.
4. Manter o campo como data/hora com timezone ou como data UTC normalizada.
5. Atualizar testes de repositório, API e autenticação.

## Como calcular os 7 dias

Regra sugerida no backend:

```text
periodo_livre = agora_utc < created_at + 7 dias
```

O cálculo deve ocorrer no backend para evitar divergência entre relógio do dispositivo, navegador e servidor.

## Onde aplicar

Aplicar no serviço de autenticação/session:

- `AuthService.liberar_general`
- qualquer regra futura de bloqueio de retorno ao General
- resposta de `/usuarios/me`, se a UI precisar mostrar aviso

Sugestão de campo calculado:

```json
{
  "trial_mode_until": "2026-05-06T00:00:00Z",
  "is_mode_switch_grace_period": true
}
```

Os nomes exatos devem ser definidos quando o contrato for alterado de forma explícita.

## Como avisar o usuário

Durante o período livre, General e Soldado devem mostrar aviso curto:

```text
Alternância livre temporária: válida nos primeiros 7 dias.
```

O aviso deve desaparecer automaticamente quando `is_mode_switch_grace_period` for falso.

## Como desativar depois

Depois de 7 dias:

1. O backend retorna `is_mode_switch_grace_period: false`.
2. O app deixa de mostrar o aviso.
3. A regra normal de bloqueio/restrição volta a ser aplicada.

## Não fazer

- Não calcular 7 dias usando data salva apenas no frontend.
- Não inferir criação pelo primeiro login local.
- Não alterar `active_mode` sem recarregar usuário da API.
- Não criar aliases de contrato sem necessidade.
