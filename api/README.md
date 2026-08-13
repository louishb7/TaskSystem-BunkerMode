# BunkerMode API

Fundacao minima do backend TypeScript/NestJS.

O backend Python em `backend/` continua sendo referencia temporaria de comportamento ate a
paridade dos modulos reais. Esta API ainda expoe apenas healthcheck.

## Scripts

```bash
npm install
npm run build
npm run lint
npm run test
npm run start
```

Healthchecks iniciais:

- `GET /api/v2/health`
- `GET /health`
