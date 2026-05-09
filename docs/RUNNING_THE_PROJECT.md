# Rodando o Projeto

Data: 2026-05-09

## Backend

Instalar dependências Python se necessário:

```bash
python -m pip install -r requirements.txt
```

Rodar API:

```bash
.venv/bin/python -m api
```

Alternativa:

```bash
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

## Web

Instalar dependências:

```bash
cd frontend-react
npm install
```

Rodar em desenvolvimento:

```bash
npm run dev
```

URL padrão:

```text
http://127.0.0.1:5173
```

Build:

```bash
npm run build
```

Check disponível:

```bash
npm run check
```

## Mobile

```bash
cd mobile
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v2 npm run start
```

## Testes backend

```bash
.venv/bin/python -m pytest
```

## Problemas comuns

API indisponível:

- conferir `VITE_API_URL`
- conferir se o backend está em `/api/v2`
- conferir CORS em `BUNKERMODE_CORS_ALLOW_ORIGINS`

Sessão quebrada no navegador:

- usar o botão da tela de erro para limpar sessão local
- ou remover `bunkermode_token` e `bunkermode_usuario` do `localStorage`

Web abre, mas não lista ordens:

- verificar token
- verificar backend
- verificar resposta de `GET /api/v2/missoes`
