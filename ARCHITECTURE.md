# Arquitetura

Camadas:

- API entrypoint (`api/main.py`)
- API routes (`api/routes.py`)
- Services (regras)
- Repositories (dados)
- Models (estrutura)

Fluxo:
Request → API → Service → Repository → Banco

Execução local:

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

Princípios:
- Separação de responsabilidades
- Baixo acoplamento
