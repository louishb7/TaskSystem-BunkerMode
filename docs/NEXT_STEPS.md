# Próximos Passos

Data: 2026-05-09

## Prioridade manual

1. Rodar uma sessão real no web: login, criar ordem, elevar prioridade, ativar Soldado, executar, retornar ao comando.
2. Validar uma falha real: deixar ordem vencer, justificar no Soldado e revisar no Pós-Ação.
3. Conferir se o IP usado em `EXPO_PUBLIC_API_URL` está correto para dispositivo físico ou emulador.
4. Revisar `docs/PROJECT_STATE.md` antes de retomar desenvolvimento.

## Bugs para verificar manualmente

- Retorno ao Comando com senha incorreta e senha correta.
- Logout automático quando a API retornar 401.
- Ordem prioritária vencida aparecendo para justificativa no Soldado.
- Elevar e rebaixar prioridade sem alterar status da ordem.
- Remoção de ordem operacional no General sem afetar histórico finalizado.
- Pós-Ação vazio e Pós-Ação com falhas pendentes.

## Polimento de UI

- Trocar confirmação nativa de remoção no web por modal visual próprio, sem mudar contrato.
- Revisar espaçamento dos cards do Soldado em telas pequenas.
- Avaliar se o painel de Revisão Semanal deve ficar mais acessível no General.
- Confirmar em dispositivo físico se o símbolo 512 x 512 mantém nitidez suficiente.

## Checklist de testes

- Backend: `.venv/bin/python -m pytest`
- Web: `npm --prefix frontend-react run build`
- Mobile: `npm --prefix mobile exec -- expo export --platform all --output-dir dist-test`
- Diff: `git diff --check`
- Depois dos checks, remover `frontend-react/dist/` e `mobile/dist-test/` se forem gerados.

## Checklist de assets

- Não importar arquivos de `docs/design-references/` no runtime.
- Manter imagens acima de 2 MB fora de `mobile/src/assets/` e `frontend-react/src/assets/`.
- Usar `docs/design-references/bunkermode/logo_final_selected.png` como fonte visual grande.
- Otimizar qualquer novo asset antes de colocar no app ou no web.

## Nota futura sobre prioridade

`prioridade` ainda é compatibilidade legada do banco e da API. Para remover:

1. Criar migração de banco planejada.
2. Ajustar schemas e testes de contrato.
3. Remover fallback `LEGACY_DEFAULT_PRIORITY`.
4. Garantir que ordenação continue baseada em Pós-Ação, prioridade elevada, prazo e `id`.
5. Só então remover referências técnicas restantes.
