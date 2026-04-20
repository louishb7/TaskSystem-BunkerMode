# API - BunkerMode

Base URL:
http://127.0.0.1:8000

## Auth

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

## Missões

POST /api/v2/missoes

GET /api/v2/missoes

PATCH /api/v2/missoes/{id}/concluir

## Header

Authorization: Bearer TOKEN
