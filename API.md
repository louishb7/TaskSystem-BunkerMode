# API - BunkerMode

URL base:
http://127.0.0.1:8000

## Rodar localmente

```bash
cd backend
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

## Autenticação

POST /api/v2/auth/register

{
  "usuario": "henrique",
  "email": "henrique@email.com",
  "senha": "123456"
}

POST /api/v2/auth/login

{
  "email": "henrique@email.com",
  "senha": "123456"
}

O campo `email` do login aceita tanto e-mail quanto nome de usuário.

## Missões

POST /api/v2/missoes

GET /api/v2/missoes

PATCH /api/v2/missoes/{id}/concluir

## Cabeçalho

Authorization: Bearer TOKEN
