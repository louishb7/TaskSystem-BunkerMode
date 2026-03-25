# BunkerMode

Sistema de gerenciamento de missões desenvolvido em Python.

## Estrutura

- **Missao**: representa uma missão única, com validações de prioridade e prazo.
- **RepositorioJSON**: responsável por salvar e carregar missões em arquivo JSON.
- **GerenciadorDeMissoes**: manipula as missões (adicionar, listar, remover, relatório).
- **Menu**: interface de interação com o usuário.

## Funcionalidades

- Adicionar missões com título, prioridade e prazo.
- Listar missões ordenadas por prioridade.
- Detalhar e marcar missões como concluídas.
- Remover missões.
- Gerar relatório com pendentes e concluídas.

## Execução

```bash
python BunkerModePOO.py
