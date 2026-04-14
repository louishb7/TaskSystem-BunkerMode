# BunkerMode Task System

Sistema de gerenciamento de tarefas com foco em disciplina e execução.

O projeto começou como uma CLI e hoje é um backend completo com API, autenticação e controle de acesso.

---

## Ideia do sistema

Dois modos:

- General → planeja
- Soldado → executa

A ideia é simples: separar quem decide do que precisa ser feito de quem só executa.

---

## O que o sistema já faz

- Criar, editar, listar e remover missões
- Concluir missões
- Autenticação com usuário e senha
- Controle de acesso (general / soldado)
- Suporte a múltiplos usuários
- Histórico de ações (auditoria)
- API REST funcional
- Testes automatizados

---

## Tecnologias

- Python
- FastAPI
- PostgreSQL
- Pytest

---

## Como rodar o projeto

### 1. Clonar

```
git clone <repo>
cd TaskSystem-BunkerMode
```

### 2. Criar ambiente virtual

```
python -m venv .venv
source .venv/bin/activate
```

### 3. Instalar dependências

```
pip install -r requirements.txt
```

### 4. Configurar ambiente

Crie um arquivo `.env`:

```
BUNKERMODE_DB_NAME=bunkermode
BUNKERMODE_DB_USER=usuario
BUNKERMODE_DB_PASSWORD=senha
BUNKERMODE_DB_HOST=localhost
BUNKERMODE_DB_PORT=5432
```

### 5. Rodar API

```
uvicorn api.routes:app --reload
```

ou

```
python -m api
```

---

## Testes

Rodar todos:

```
pytest
```

Teste com banco real (opcional):

```
export BUNKERMODE_TEST_DB_URL="sua_string"
pytest -m integration
```

---

## Estrutura (simplificada)

```
api/        → rotas HTTP
services/   → regras de negócio
tests/      → testes
```

---

## Estado atual

Backend já está sólido:

- API funcionando
- autenticação pronta
- regras de acesso implementadas
- persistência com PostgreSQL
- testes cobrindo o sistema

---

## Próximo passo

Construir o frontend consumindo a API.

---

Projeto focado em aprendizado e evolução prática de backend.
